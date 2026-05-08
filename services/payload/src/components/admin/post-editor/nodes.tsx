'use client';

// Decorator nodes Lexical pour les 4 blocks Carnet :
//   - footnote        (inline) : note de bas de page
//   - biblio_inline   (inline) : référence biblio « (Auteur, an) »
//   - citation_bloc   (block)  : citation longue avec source
//   - figure          (block)  : image + légende + crédit
//
// Format JSON aligné sur celui généré par Payload BlocksFeature
// (`type: 'block'` ou `'inlineBlock'`, `fields.blockType`, `fields.*`),
// pour que les posts existants se chargent sans migration et que le
// frontend Astro continue à les lire avec `renderLexicalWithFootnotes`.
//
// Edition : chaque block rend un petit form inline (textareas + selects)
// dans son propre DOM — pas de drawer Payload, pas de modal.

import React, { useEffect, useRef, useState } from 'react';
import { $getNodeByKey, DecoratorNode } from 'lexical';
import type {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

import { useBiblioOptions } from './context';

// ─── Types ────────────────────────────────────────────────────────

export type FootnoteFields = { content: string };
export type BiblioInlineFields = {
  entry: number | string | null;
  prefix?: string;
  suffix?: string;
};
export type CitationBlocFields = { text: string; source?: string };
export type FigureFields = {
  image: number | string | null;
  legende?: string;
  credit?: string;
  align?: 'corps' | 'centre' | 'pleine';
};

export type CarnetBlockData =
  | { blockType: 'citation_bloc'; fields: CitationBlocFields }
  | { blockType: 'figure'; fields: FigureFields };

export type CarnetInlineBlockData =
  | { blockType: 'footnote'; fields: FootnoteFields }
  | { blockType: 'biblio_inline'; fields: BiblioInlineFields };

type SerializedBlock = Spread<
  {
    type: 'block';
    version: 1;
    fields: { blockType: string } & Record<string, unknown>;
  },
  SerializedLexicalNode
>;

type SerializedInlineBlock = Spread<
  {
    type: 'inlineBlock';
    version: 1;
    fields: { blockType: string } & Record<string, unknown>;
  },
  SerializedLexicalNode
>;

// ─── Helpers UI ───────────────────────────────────────────────────

function useNodeFields<F extends Record<string, unknown>>(
  nodeKey: NodeKey,
  initial: F,
): [F, (patch: Partial<F>) => void] {
  const [editor] = useLexicalComposerContext();
  const [local, setLocal] = useState<F>(initial);

  // Patch -> editor update (utilise $getNodeByKey, pas l'accès direct
  // au nodeMap qui est une internal API).
  function patch(p: Partial<F>) {
    setLocal((cur) => {
      const next = { ...cur, ...p };
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if (
          node &&
          (node instanceof CarnetBlockNode || node instanceof CarnetInlineBlockNode)
        ) {
          // getWritable() pour respecter le mécanisme de copy-on-write
          // de Lexical (un node `decorate()` retourne un read-only).
          const writable = node.getWritable() as CarnetBlockNode | CarnetInlineBlockNode;
          writable.__fields = { ...writable.__fields, ...(p as Record<string, unknown>) };
        }
      });
      return next;
    });
  }

  return [local, patch];
}

// ─── React renderers par blockType ────────────────────────────────

function FootnoteRenderer({
  nodeKey,
  fields,
}: {
  nodeKey: NodeKey;
  fields: FootnoteFields;
}) {
  const [local, patch] = useNodeFields<FootnoteFields>(nodeKey, fields);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <span ref={ref} className="ed-fn">
      <span
        className="ed-fn__anchor"
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        [fn]
      </span>
      {open && (
        <span className="ed-fn__pop">
          <span className="lbl">Note de bas de page</span>
          <textarea
            rows={3}
            value={local.content ?? ''}
            placeholder="Texte de la note…"
            onChange={(e) => patch({ content: e.target.value })}
          />
        </span>
      )}
    </span>
  );
}

function BiblioInlineRenderer({
  nodeKey,
  fields,
}: {
  nodeKey: NodeKey;
  fields: BiblioInlineFields;
}) {
  const [local, patch] = useNodeFields<BiblioInlineFields>(nodeKey, fields);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const biblioOptions = useBiblioOptions();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Affichage : (auteur, année) si la référence est trouvée, sinon
  // « (réf. à choisir) ».
  const selected = local.entry
    ? biblioOptions.find((b) => String(b.id) === String(local.entry))
    : null;
  const label = selected
    ? `(${selected.author ?? '—'}${selected.year ? `, ${selected.year}` : ''})`
    : '(réf. à choisir)';

  return (
    <span ref={ref} className="ed-bi">
      <span
        className="ed-bi__tag"
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        {label}
      </span>
      {open && (
        <span className="ed-bi__pop">
          <span className="lbl">Référence bibliographique</span>
          <select
            value={local.entry == null ? '' : String(local.entry)}
            onChange={(e) =>
              patch({ entry: e.target.value === '' ? null : Number(e.target.value) || e.target.value })
            }
          >
            <option value="">— aucune —</option>
            {biblioOptions.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.author ?? '—'}
                {b.year ? ` (${b.year})` : ''}
                {b.title ? ` · ${b.title}` : ''}
              </option>
            ))}
          </select>
          <span className="lbl">Préfixe</span>
          <input
            type="text"
            value={local.prefix ?? ''}
            placeholder="cf., voir…"
            onChange={(e) => patch({ prefix: e.target.value })}
          />
          <span className="lbl">Suffixe</span>
          <input
            type="text"
            value={local.suffix ?? ''}
            placeholder=", p. 47"
            onChange={(e) => patch({ suffix: e.target.value })}
          />
        </span>
      )}
    </span>
  );
}

function CitationBlocRenderer({
  nodeKey,
  fields,
}: {
  nodeKey: NodeKey;
  fields: CitationBlocFields;
}) {
  const [local, patch] = useNodeFields<CitationBlocFields>(nodeKey, fields);
  return (
    <div className="ed-cit" contentEditable={false}>
      <textarea
        className="ed-cit__text"
        rows={3}
        value={local.text ?? ''}
        placeholder="Texte de la citation…"
        onChange={(e) => patch({ text: e.target.value })}
      />
      <input
        className="ed-cit__src"
        type="text"
        value={local.source ?? ''}
        placeholder="Source — ex : Puar (2007), p. 23"
        onChange={(e) => patch({ source: e.target.value })}
      />
    </div>
  );
}

function FigureRenderer({
  nodeKey,
  fields,
}: {
  nodeKey: NodeKey;
  fields: FigureFields;
}) {
  const [local, patch] = useNodeFields<FigureFields>(nodeKey, fields);
  return (
    <figure className="ed-fig" contentEditable={false}>
      <div className="ed-fig__upload">
        <span className="lbl">Média (ID Payload)</span>
        <input
          type="text"
          value={String(local.image ?? '')}
          placeholder="Coller l'ID d'un média…"
          onChange={(e) => patch({ image: e.target.value || null })}
        />
        {local.image && (
          <img
            src={`/cms/api/media/${local.image}?depth=0`}
            alt={local.legende ?? ''}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </div>
      <textarea
        className="ed-fig__cap"
        rows={2}
        value={local.legende ?? ''}
        placeholder="Légende…"
        onChange={(e) => patch({ legende: e.target.value })}
      />
      <input
        className="ed-fig__credit"
        type="text"
        value={local.credit ?? ''}
        placeholder="Crédit / source"
        onChange={(e) => patch({ credit: e.target.value })}
      />
      <select
        className="ed-fig__align"
        value={local.align ?? 'corps'}
        onChange={(e) => patch({ align: e.target.value as FigureFields['align'] })}
      >
        <option value="corps">Largeur du corps</option>
        <option value="centre">Centré</option>
        <option value="pleine">Pleine largeur</option>
      </select>
    </figure>
  );
}

// ─── Block-level decorator ────────────────────────────────────────

export class CarnetBlockNode extends DecoratorNode<React.ReactElement> {
  __blockType: string;
  __fields: Record<string, unknown>;

  static getType(): string {
    return 'block';
  }
  static clone(node: CarnetBlockNode): CarnetBlockNode {
    return new CarnetBlockNode(node.__blockType, { ...node.__fields }, node.__key);
  }

  constructor(blockType: string, fields: Record<string, unknown>, key?: NodeKey) {
    super(key);
    this.__blockType = blockType;
    this.__fields = fields;
  }

  static importJSON(json: SerializedBlock): CarnetBlockNode {
    const f = json.fields ?? {};
    const { blockType, ...rest } = f;
    return new CarnetBlockNode(String(blockType ?? 'unknown'), rest as Record<string, unknown>);
  }

  exportJSON(): SerializedBlock {
    return {
      type: 'block',
      version: 1,
      fields: { blockType: this.__blockType, ...this.__fields },
    };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const el = document.createElement('div');
    el.className = 'ed-block';
    el.setAttribute('data-block-type', this.__blockType);
    return el;
  }
  updateDOM(): false {
    return false;
  }

  decorate(_editor: LexicalEditor): React.ReactElement {
    const fields = { ...this.__fields } as Record<string, unknown>;
    const key = this.__key;
    if (this.__blockType === 'citation_bloc') {
      return (
        <CitationBlocRenderer
          nodeKey={key}
          fields={{
            text: String(fields.text ?? ''),
            source: String(fields.source ?? ''),
          }}
        />
      );
    }
    if (this.__blockType === 'figure') {
      return (
        <FigureRenderer
          nodeKey={key}
          fields={{
            image: (fields.image as number | string | null) ?? null,
            legende: String(fields.legende ?? ''),
            credit: String(fields.credit ?? ''),
            align: (fields.align as FigureFields['align']) ?? 'corps',
          }}
        />
      );
    }
    return (
      <div className="ed-block-unknown">
        Bloc non reconnu : <code>{this.__blockType}</code>
      </div>
    );
  }
}

export function $createCarnetBlockNode(data: CarnetBlockData): CarnetBlockNode {
  return new CarnetBlockNode(data.blockType, data.fields as Record<string, unknown>);
}

export function $isCarnetBlockNode(node: LexicalNode | null | undefined): node is CarnetBlockNode {
  return node instanceof CarnetBlockNode;
}

// ─── Inline decorator ─────────────────────────────────────────────

export class CarnetInlineBlockNode extends DecoratorNode<React.ReactElement> {
  __blockType: string;
  __fields: Record<string, unknown>;

  static getType(): string {
    return 'inlineBlock';
  }
  static clone(node: CarnetInlineBlockNode): CarnetInlineBlockNode {
    return new CarnetInlineBlockNode(node.__blockType, { ...node.__fields }, node.__key);
  }

  constructor(blockType: string, fields: Record<string, unknown>, key?: NodeKey) {
    super(key);
    this.__blockType = blockType;
    this.__fields = fields;
  }

  isInline(): true {
    return true;
  }

  static importJSON(json: SerializedInlineBlock): CarnetInlineBlockNode {
    const f = json.fields ?? {};
    const { blockType, ...rest } = f;
    return new CarnetInlineBlockNode(
      String(blockType ?? 'unknown'),
      rest as Record<string, unknown>,
    );
  }

  exportJSON(): SerializedInlineBlock {
    return {
      type: 'inlineBlock',
      version: 1,
      fields: { blockType: this.__blockType, ...this.__fields },
    };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const el = document.createElement('span');
    el.className = 'ed-inline';
    el.setAttribute('data-block-type', this.__blockType);
    return el;
  }
  updateDOM(): false {
    return false;
  }

  decorate(_editor: LexicalEditor): React.ReactElement {
    const fields = { ...this.__fields } as Record<string, unknown>;
    const key = this.__key;
    if (this.__blockType === 'footnote') {
      return (
        <FootnoteRenderer
          nodeKey={key}
          fields={{ content: String(fields.content ?? '') }}
        />
      );
    }
    if (this.__blockType === 'biblio_inline') {
      return (
        <BiblioInlineRenderer
          nodeKey={key}
          fields={{
            entry: (fields.entry as number | string | null) ?? null,
            prefix: String(fields.prefix ?? ''),
            suffix: String(fields.suffix ?? ''),
          }}
        />
      );
    }
    return <span className="ed-inline-unknown">[{this.__blockType}]</span>;
  }
}

export function $createCarnetInlineBlockNode(
  data: CarnetInlineBlockData,
): CarnetInlineBlockNode {
  return new CarnetInlineBlockNode(data.blockType, data.fields as Record<string, unknown>);
}

export function $isCarnetInlineBlockNode(
  node: LexicalNode | null | undefined,
): node is CarnetInlineBlockNode {
  return node instanceof CarnetInlineBlockNode;
}
