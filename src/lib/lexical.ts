/**
 * Mini-renderer Lexical → HTML pour Astro SSR.
 *
 * Couvre les nodes utilisés dans le seed et les billets standards :
 * paragraph, heading (h2/h3), quote, list/listitem, link, et les nodes
 * texte avec format (bold=1, italic=2, strikethrough=4, underline=8, code=16).
 *
 * Les blocks Lexical custom (Footnote, CitationBloc, BiblioInline, Figure)
 * ne sont pas rendus à ce stade — leur format dépendra de la BlocksFeature
 * branchée dans la config Lexical Payload (issue #12 step ultérieure).
 *
 * Helpers :
 *  - renderLexical : node → HTML string
 *  - extractToc : node → liste { id, text, level } pour le sommaire
 *  - slugify : chaîne → identifiant URL-safe (utilisé pour les ids de h2)
 */

type LexicalNode = {
  type?: string;
  tag?: string;
  text?: string;
  format?: number;
  fields?: { url?: string; newTab?: boolean };
  listType?: 'number' | 'bullet';
  children?: LexicalNode[];
};

const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_STRIKETHROUGH = 4;
const FORMAT_UNDERLINE = 8;
const FORMAT_CODE = 16;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function renderText(node: LexicalNode): string {
  if (typeof node.text !== 'string') return '';
  let html = escapeHtml(node.text);
  const fmt = node.format ?? 0;
  if (fmt & FORMAT_CODE) html = `<code>${html}</code>`;
  if (fmt & FORMAT_BOLD) html = `<strong>${html}</strong>`;
  if (fmt & FORMAT_ITALIC) html = `<em>${html}</em>`;
  if (fmt & FORMAT_STRIKETHROUGH) html = `<s>${html}</s>`;
  if (fmt & FORMAT_UNDERLINE) html = `<u>${html}</u>`;
  return html;
}

function renderChildren(children: LexicalNode[] | undefined): string {
  if (!children) return '';
  return children.map(renderLexical).join('');
}

export function renderLexical(node: LexicalNode | unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as LexicalNode & { root?: LexicalNode };
  // Wrapper { root: {...} } : descend dans root
  if ('root' in n && n.root) return renderChildren(n.root.children);
  if (typeof n.text === 'string') return renderText(n);

  const inner = renderChildren(n.children);

  switch (n.type) {
    case 'root':
      return inner;
    case 'paragraph':
      return `<p>${inner}</p>`;
    case 'heading': {
      const tag = n.tag === 'h3' ? 'h3' : 'h2';
      const text = (n.children ?? [])
        .map((c) => (typeof c.text === 'string' ? c.text : ''))
        .join('');
      const id = slugify(text);
      return `<${tag} id="${id}">${inner}</${tag}>`;
    }
    case 'quote':
      return `<blockquote>${inner}</blockquote>`;
    case 'list': {
      const tag = n.listType === 'number' ? 'ol' : 'ul';
      return `<${tag}>${inner}</${tag}>`;
    }
    case 'listitem':
      return `<li>${inner}</li>`;
    case 'link': {
      const url = n.fields?.url || '#';
      const safe = escapeHtml(url);
      const isExternal = /^https?:\/\//.test(url);
      const cls = isExternal ? 'ext' : 'int';
      const rel = isExternal ? ' rel="noopener"' : '';
      return `<a href="${safe}" class="${cls}"${rel}>${inner}</a>`;
    }
    case 'linebreak':
      return '<br />';
    default:
      return inner;
  }
}

export type TocEntry = { id: string; text: string; level: 2 | 3 };

export function extractToc(node: LexicalNode | unknown): TocEntry[] {
  const out: TocEntry[] = [];
  function walk(n: LexicalNode | unknown) {
    if (!n || typeof n !== 'object') return;
    const x = n as LexicalNode & { root?: LexicalNode };
    if ('root' in x && x.root) return walk(x.root);
    if (x.type === 'heading') {
      const text = (x.children ?? [])
        .map((c) => (typeof c.text === 'string' ? c.text : ''))
        .join('');
      const level = x.tag === 'h3' ? 3 : 2;
      out.push({ id: slugify(text), text, level });
    }
    if (x.children) for (const c of x.children) walk(c);
  }
  walk(node);
  return out;
}

/**
 * Extrait le texte brut d'un body Lexical — utile pour le calcul du
 * temps de lecture côté frontend si on veut le recalculer (sinon le
 * champ readingTime est déjà persisté côté Payload).
 */
export function extractText(node: LexicalNode | unknown): string {
  if (!node || typeof node !== 'object') return '';
  const x = node as LexicalNode & { root?: LexicalNode };
  if ('root' in x && x.root) return extractText(x.root);
  if (typeof x.text === 'string') return x.text + ' ';
  return (x.children ?? []).map(extractText).join('');
}
