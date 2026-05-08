'use client';

// PostEditView (client) — vue Édition custom d'un Post qui matche le
// handoff admin (cf Design/design_handoff_admin/carnet-admin.html →
// ScreenDoc). Layout :
//
//   header.top : crumbs + chip statut + actions Sauvegarder / Publier
//   .doc grid : center 1fr | meta 300px
//     center : .ed-card (ed-num + title + lede + divider + body Lexical)
//              + .fn-block (notes auto-numérotées)
//     meta   : Métadonnées · Calendrier · Biblio liée · Auto-calculé
//
// Fetch / save via /cms/api/posts/[id] (cookies de session). Le body
// est édité par un Lexical custom (cf body/Editor.tsx) sans aucune
// chrome Payload — slash menu maison, theme maison, blocks rendus
// par nos nodes décorateur.

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

// useLayoutEffect côté serveur déclenche un warning React. On bascule
// sur useEffect pendant le SSR (pas critique : ce composant est 'use
// client', donc le SSR n'est qu'un premier passage).
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Petit hook : ajuste la hauteur d'un <textarea> à son contenu, sans
// scroll interne, sans poignée de redimensionnement (cf CSS
// `resize: none`). Re-mesure à chaque changement de `value`.
function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return ref;
}

import { type LexicalEditor } from 'lexical';

import PostBodyEditor, {
  deleteBiblioInlinesByEntry,
  deleteFootnoteByIndex,
  extractBiblioInlineIds,
  extractFootnotes,
  type LexicalState,
} from './post-editor/Editor';

const API_POSTS = '/cms/api/posts';

type PostType = 'analyse' | 'note' | 'fiche';

type Theme = { id: number | string; slug: string; name: string };
type BibEntry = {
  id: number | string;
  slug?: string;
  author?: string;
  year?: number | string;
  title?: string;
};

type Post = {
  id: number | string;
  numero?: number | null;
  title: string;
  slug: string;
  type: PostType;
  themes?: (Theme | number | string)[] | null;
  publishedAt: string;
  updatedAt?: string;
  lede: string;
  body?: LexicalState | null;
  bibliography?: (BibEntry | number | string)[] | null;
  readingTime?: number | null;
  idCarnet?: string | null;
  draft?: boolean;
};

type Status = 'draft' | 'scheduled' | 'published';

const TYPE_LABELS: Record<PostType, string> = {
  analyse: 'Analyse',
  note: 'Note de lecture',
  fiche: 'Fiche',
};

const STATUS_LABEL: Record<Status, string> = {
  draft: 'Brouillon',
  scheduled: 'Planifié',
  published: 'Publié',
};

function pad3(n: number | string | undefined | null): string {
  if (n === undefined || n === null || n === '') return '—';
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  if (Number.isNaN(num)) return String(n);
  return String(num).padStart(3, '0');
}

function inferStatus(p: Pick<Post, 'draft' | 'publishedAt'>): Status {
  if (p.draft) return 'draft';
  if (p.publishedAt && new Date(p.publishedAt).getTime() > Date.now()) return 'scheduled';
  return 'published';
}

function isoDate(d: string | undefined | null): string {
  if (!d) return '';
  return d.slice(0, 10);
}

function relativeSavedAt(at: number | null): string {
  if (!at) return '';
  const sec = Math.round((Date.now() - at) / 1000);
  if (sec < 5) return 'à l’instant';
  if (sec < 60) return `il y a ${sec} s`;
  const m = Math.round(sec / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  return `il y a ${h} h`;
}

const EMPTY_DRAFT: Omit<Post, 'id'> & { id?: number | string | null } = {
  numero: null,
  title: '',
  slug: '',
  type: 'analyse',
  themes: [],
  publishedAt: new Date().toISOString().slice(0, 10),
  lede: '',
  body: null,
  bibliography: [],
  draft: true,
};

export default function PostEditViewClient({
  docId,
}: {
  docId: string | null;
}): React.ReactElement {
  const [post, setPost] = useState<Post | (Omit<Post, 'id'> & { id?: number | string | null })>(
    EMPTY_DRAFT,
  );
  const [initialJson, setInitialJson] = useState<string>(JSON.stringify(EMPTY_DRAFT));
  const [themes, setThemes] = useState<Theme[]>([]);
  const [biblioOptions, setBiblioOptions] = useState<BibEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Tick toutes les 30s pour rafraîchir le « il y a X min »
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Fetch initial post + thèmes + biblio
  useEffect(() => {
    setLoading(true);
    setError(null);
    const themesP = fetch('/cms/api/themes?limit=100&depth=0&sort=name', {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((data: { docs: Theme[] }) => setThemes(data.docs ?? []))
      .catch(() => setThemes([]));
    const biblioP = fetch('/cms/api/bibliography?limit=200&depth=0&sort=author', {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((data: { docs: BibEntry[] }) => setBiblioOptions(data.docs ?? []))
      .catch(() => setBiblioOptions([]));

    if (!docId) {
      // Création : pas de fetch post, on part de EMPTY_DRAFT
      Promise.all([themesP, biblioP]).finally(() => {
        setInitialJson(JSON.stringify(EMPTY_DRAFT));
        setLoading(false);
      });
      return;
    }

    const postP = fetch(`${API_POSTS}/${encodeURIComponent(docId)}?depth=1`, {
      credentials: 'include',
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((doc: Post) => {
        const norm: Post = {
          ...doc,
          themes: Array.isArray(doc.themes) ? doc.themes : [],
          bibliography: Array.isArray(doc.bibliography) ? doc.bibliography : [],
          body: doc.body ?? null,
        };
        setPost(norm);
        setInitialJson(JSON.stringify(norm));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      });

    Promise.all([themesP, biblioP, postP]).finally(() => setLoading(false));
  }, [docId]);

  const dirty = JSON.stringify(post) !== initialJson;
  const status: Status = inferStatus(post);
  const idCarnet = useMemo(() => {
    if (!post.numero || !post.publishedAt) return null;
    const y = new Date(post.publishedAt).getFullYear();
    if (Number.isNaN(y)) return null;
    return `carnet:${y}-${pad3(post.numero)}`;
  }, [post.numero, post.publishedAt]);

  function patch<K extends keyof Post>(key: K, value: Post[K]) {
    setPost((p) => ({ ...p, [key]: value }));
  }

  function toggleTheme(themeId: number | string) {
    setPost((p) => {
      const cur = (p.themes ?? []) as (Theme | number | string)[];
      const ids = cur.map((t) => (typeof t === 'object' ? t.id : t));
      if (ids.includes(themeId)) {
        return { ...p, themes: cur.filter((t) => (typeof t === 'object' ? t.id : t) !== themeId) };
      }
      const found = themes.find((t) => t.id === themeId);
      return { ...p, themes: [...cur, found ?? themeId] };
    });
  }

  function toggleBiblio(entryId: number | string) {
    setPost((p) => {
      const cur = (p.bibliography ?? []) as (BibEntry | number | string)[];
      const ids = cur.map((b) => (typeof b === 'object' ? b.id : b));
      if (ids.includes(entryId)) {
        return {
          ...p,
          bibliography: cur.filter((b) => (typeof b === 'object' ? b.id : b) !== entryId),
        };
      }
      const found = biblioOptions.find((b) => b.id === entryId);
      return { ...p, bibliography: [...cur, found ?? entryId] };
    });
  }

  async function save(opts: { publish?: boolean } = {}) {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        numero: post.numero ?? null,
        title: post.title,
        slug: post.slug,
        type: post.type,
        themes: (post.themes ?? []).map((t) => (typeof t === 'object' ? t.id : t)),
        publishedAt: post.publishedAt,
        lede: post.lede,
        body: post.body,
        bibliography: (post.bibliography ?? []).map((b) => (typeof b === 'object' ? b.id : b)),
        draft: opts.publish ? false : post.draft,
      };
      const url =
        post.id != null && post.id !== ''
          ? `${API_POSTS}/${encodeURIComponent(String(post.id))}`
          : API_POSTS;
      const method = post.id != null && post.id !== '' ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status} — ${t.slice(0, 200)}`);
      }
      const json = (await res.json()) as { doc?: Post } | Post;
      const fresh: Post = (json as { doc?: Post }).doc ?? (json as Post);
      const norm: Post = {
        ...fresh,
        themes: Array.isArray(fresh.themes) ? fresh.themes : [],
        bibliography: Array.isArray(fresh.bibliography) ? fresh.bibliography : [],
        body: fresh.body ?? null,
      };
      setPost(norm);
      setInitialJson(JSON.stringify(norm));
      setSavedAt(Date.now());
      // Si on vient de créer, redirige vers l'URL d'édition stable
      if (!docId && fresh.id != null) {
        const path = `/cms/admin/collections/posts/${fresh.id}`;
        if (typeof window !== 'undefined') window.history.replaceState(null, '', path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  // Raccourci ⌘S / Ctrl+S
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty && !saving) void save();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, saving, post]);

  // Footnotes extraites du body Lexical pour le panneau .fn-block
  const footnotes = useMemo(() => extractFootnotes(post.body), [post.body]);

  // Auto-grow refs pour le titre (multi-ligne) et le chapô
  const titleRef = useAutoGrow(post.title);
  const ledeRef = useAutoGrow(post.lede);

  // Référence vers l'éditeur Lexical pour pouvoir supprimer des nodes
  // (footnotes / biblio_inline) depuis le panneau pied. On walke
  // l'arbre LIVE de l'éditeur (les keys sérialisées du JSON ne
  // matchent pas les keys runtime de Lexical), via les helpers
  // exportés par post-editor/Editor.
  const editorRef = useRef<LexicalEditor | null>(null);

  function deleteFootnote(index: number) {
    const editor = editorRef.current;
    if (!editor) return;
    deleteFootnoteByIndex(editor, index);
  }

  function deleteBiblioRef(id: number | string) {
    // 1. Retire de la liste explicite (si présente)
    setPost((p) => {
      const cur = (p.bibliography ?? []) as Array<BibEntry | number | string>;
      const filtered = cur.filter(
        (b) => String(typeof b === 'object' ? b.id : b) !== String(id),
      );
      return filtered.length === cur.length ? p : { ...p, bibliography: filtered };
    });
    // 2. Supprime toutes les citations inline qui pointent sur cet
    //    entry (un même ouvrage peut être cité plusieurs fois).
    const editor = editorRef.current;
    if (editor) deleteBiblioInlinesByEntry(editor, id);
  }

  // Rafraîchit l'affichage relatif "il y a X min" (now est l'horloge)
  void now;
  const savedLabel = savedAt ? `Sauvegardé ${relativeSavedAt(savedAt)}` : '';

  const themeIds = (post.themes ?? []).map((t) => (typeof t === 'object' ? t.id : t));
  const explicitBiblioIds = (post.bibliography ?? []).map((b) =>
    typeof b === 'object' ? b.id : b,
  );
  // Union des refs explicitement listées (post.bibliography) et des
  // refs citées inline dans le corps (biblio_inline blocks). Permet
  // d'auto-peupler le panneau Bibliographie liée — l'utilisatrice
  // n'a pas à re-lister manuellement une référence déjà citée.
  const inlineBiblioIds = useMemo(() => extractBiblioInlineIds(post.body), [post.body]);
  const biblioIds = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<number | string> = [];
    for (const id of [...explicitBiblioIds, ...inlineBiblioIds]) {
      const k = String(id);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(id);
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(explicitBiblioIds), inlineBiblioIds]);

  return (
    <div className="carnet-postedit">
      <header className="carnet-postedit__top">
        <div className="carnet-postedit__crumbs">
          <Link href="/cms/admin">Carnet</Link>
          <span className="sep" aria-hidden="true">/</span>
          <Link href="/cms/admin/collections/posts">Billets</Link>
          <span className="sep" aria-hidden="true">/</span>
          <span className="cur">
            n°&nbsp;{pad3(post.numero ?? null)}
          </span>
        </div>
        <span className={`carnet-status carnet-status--${status}`}>
          <span className="carnet-status__dot" aria-hidden="true" />
          {STATUS_LABEL[status]}
        </span>
        <div className="carnet-postedit__spacer" />
        <div
          className="carnet-postedit__acts"
          // Le state initial (loading=true, post.draft=true,
          // savedAt=null...) diverge entre SSR et client après que
          // useEffect(fetch) ait commencé à mettre à jour : React
          // 19 est strict sur la cohérence hydration des `disabled`
          // booléens et du texte ternaire. La valeur converge
          // correctement après mount — on supprime juste le warning
          // bruyant en dev.
          suppressHydrationWarning
        >
          {savedLabel && !dirty && (
            <span className="carnet-postedit__saved" aria-live="polite">
              {savedLabel}
            </span>
          )}
          {dirty && (
            <span className="carnet-postedit__dirty" aria-live="polite">
              Modifications non enregistrées
            </span>
          )}
          {post.slug && post.id != null && (
            <a
              className="carnet-btn carnet-btn--ghost"
              href={`/billets/${post.slug}/`}
              target="_blank"
              rel="noreferrer"
            >
              Aperçu ↗
            </a>
          )}
          <button
            type="button"
            className="carnet-btn"
            onClick={() => void save()}
            disabled={!dirty || saving || loading}
            title="Sauvegarder (⌘S)"
            suppressHydrationWarning
          >
            {saving ? 'Enregistrement…' : 'Sauvegarder'}
            <span className="kbd" aria-hidden="true">⌘S</span>
          </button>
          <button
            type="button"
            className="carnet-btn carnet-btn--accent"
            onClick={() => void save({ publish: true })}
            disabled={saving || loading}
            suppressHydrationWarning
          >
            {post.draft ? 'Publier' : 'Publier les modifications'}
          </button>
        </div>
      </header>

      {error && <div className="carnet-postedit__error">Erreur : {error}</div>}

      {loading ? (
        <div className="carnet-postedit__loading">Chargement…</div>
      ) : (
        <div className="carnet-postedit__doc">
          <div className="carnet-postedit__center">
            <div className="ed-card">
              <div className="ed-num">
                <span className="ed-num__id">
                  Billet n°&nbsp;{pad3(post.numero ?? null)}
                  {idCarnet && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="id">{idCarnet}</span>
                    </>
                  )}
                </span>
                {themeIds.length > 0 && (
                  <span className="ed-num__themes">
                    {themeIds.map((id, i) => {
                      const t = themes.find((x) => x.id === id);
                      if (!t) return null;
                      return (
                        <React.Fragment key={id}>
                          {i > 0 && <span aria-hidden="true"> · </span>}
                          <span className="tag">#{t.slug ?? t.name}</span>
                        </React.Fragment>
                      );
                    })}
                  </span>
                )}
              </div>
              <textarea
                ref={titleRef}
                className="ed-title"
                rows={1}
                value={post.title}
                placeholder="Titre du billet"
                onKeyDown={(e) => {
                  // Pas de retour à la ligne dans le titre — Enter
                  // déplace simplement le focus au chapô.
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    ledeRef.current?.focus();
                  }
                }}
                onChange={(e) => patch('title', e.target.value)}
              />
              <textarea
                ref={ledeRef}
                className="ed-lede"
                rows={1}
                value={post.lede}
                placeholder="Chapô — 2 à 3 phrases."
                onChange={(e) => patch('lede', e.target.value)}
              />
              <hr className="ed-divider" />
              <PostBodyEditor
                value={post.body ?? null}
                onChange={(v) => patch('body', v)}
                biblioOptions={biblioOptions}
                onEditor={(editor) => {
                  editorRef.current = editor;
                }}
              />
            </div>

            <div className="fn-block">
              <div className="fn-block__h">
                <span>Notes de bas de page ({footnotes.length})</span>
              </div>
              <div className="fn-block__help">
                Pour ajouter une note dans le corps : tape <kbd>/</kbd> puis
                « Note de bas de page » — écris le contenu dans le panneau
                qui s’ouvre.
                <br />
                Les notes apparaissent ici, numérotées automatiquement.
              </div>
              {footnotes.length === 0 ? (
                <div className="fn-block__empty">Aucune note pour le moment.</div>
              ) : (
                footnotes.map((f) => (
                  <div key={f.key} className="fn-row">
                    <div className="n">[{f.index}]</div>
                    <div className="body">{f.content || <em className="muted">Note vide</em>}</div>
                    <button
                      type="button"
                      className="x"
                      onClick={() => deleteFootnote(f.index)}
                      aria-label="Supprimer la note dans le corps"
                      title="Supprimer la note dans le corps"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="bib-block">
              <div className="bib-block__h">
                <span>Bibliographie liée ({biblioIds.length})</span>
              </div>
              <div className="bib-block__help">
                Pour <em>citer</em> une référence dans le corps : tape <kbd>/</kbd>{' '}
                puis « Bibliographie inline » — choisis-la dans le panneau qui
                s’ouvre.
                <br />
                Pour <em>lister</em> une référence sans la citer dans le corps :
                ajoute-la directement ci-dessous.
              </div>
              <div className="biblio-list">
                {biblioIds.length === 0 && (
                  <div className="b-row b-row--empty">Aucune référence liée.</div>
                )}
                {biblioIds.map((id, i) => {
                  const e = biblioOptions.find((b) => b.id === id);
                  const isInline = inlineBiblioIds.some((iid) => String(iid) === String(id));
                  // × supprime la ref de l'explicite ET supprime
                  // toutes les citations inline du corps qui la
                  // pointent. Tooltip différencié si la ref est aussi
                  // citée dans le corps, pour que l'utilisatrice sache
                  // qu'elle va aussi modifier le texte.
                  const title = isInline
                    ? 'Retirer + supprimer la (les) citation(s) dans le corps'
                    : 'Retirer de la liste';
                  if (!e)
                    return (
                      <div key={String(id)} className="b-row">
                        <div className="n">[{i + 1}]</div>
                        <div className="body">
                          <span className="muted">Réf. #{String(id)}</span>
                        </div>
                        <button
                          type="button"
                          className="x"
                          onClick={() => deleteBiblioRef(id)}
                          aria-label={title}
                          title={title}
                        >
                          ×
                        </button>
                      </div>
                    );
                  return (
                    <div key={String(id)} className="b-row">
                      <div className="n">[{i + 1}]</div>
                      <div className="body">
                        <span className="au">{e.author ?? '—'}</span>
                        {e.year && <> ({e.year})</>}
                        {e.title && (
                          <>
                            , <span className="ti">{e.title}</span>
                          </>
                        )}
                        .
                      </div>
                      <button
                        type="button"
                        className="x"
                        onClick={() => deleteBiblioRef(id)}
                        aria-label={title}
                        title={title}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              <details className="add-rel-wrap">
                <summary className="add-rel">+ Ajouter une référence…</summary>
                <div className="add-rel-list">
                  {biblioOptions
                    .filter((b) => !biblioIds.includes(b.id))
                    .slice(0, 50)
                    .map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className="add-rel-item"
                        onClick={() => toggleBiblio(b.id)}
                      >
                        <span className="au">{b.author ?? '—'}</span>
                        {b.year && <> ({b.year})</>}
                        {b.title && <> · <span className="ti">{b.title}</span></>}
                      </button>
                    ))}
                </div>
              </details>
            </div>
          </div>

          <aside className="carnet-postedit__meta">
            <h3>Métadonnées</h3>
            <div className="row">
              <div className="field">
                <label>Numéro de billet</label>
                <input
                  type="number"
                  value={post.numero ?? ''}
                  onChange={(e) =>
                    patch('numero', e.target.value === '' ? null : Number(e.target.value))
                  }
                />
              </div>
              <div className="field">
                <label>Type</label>
                <select
                  value={post.type}
                  onChange={(e) => patch('type', e.target.value as PostType)}
                >
                  {(Object.keys(TYPE_LABELS) as PostType[]).map((k) => (
                    <option key={k} value={k}>
                      {TYPE_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Slug</label>
              <input
                type="text"
                value={post.slug}
                onChange={(e) => patch('slug', e.target.value)}
              />
              {post.slug && post.publishedAt && (
                <div className="help">
                  URL :{' '}
                  <span className="mono">
                    /{new Date(post.publishedAt).getFullYear()}/
                    {String(new Date(post.publishedAt).getMonth() + 1).padStart(2, '0')}/{post.slug}
                  </span>
                </div>
              )}
            </div>
            <div className="field">
              <label>Visibilité</label>
              <select
                value={post.draft ? 'draft' : 'published'}
                onChange={(e) => patch('draft', e.target.value === 'draft')}
              >
                <option value="draft">Brouillon — invisible côté lecteur</option>
                <option value="published">Publié — visible côté lecteur</option>
              </select>
            </div>
            <div className="field">
              <label>Thèmes</label>
              <details className="multi-select">
                <summary>
                  {themeIds.length === 0
                    ? 'Sélectionner des thèmes…'
                    : `${themeIds.length} thème${themeIds.length > 1 ? 's' : ''} sélectionné${
                        themeIds.length > 1 ? 's' : ''
                      }`}
                </summary>
                <div className="multi-select__list">
                  {themes.length === 0 && (
                    <div className="multi-select__empty">Aucun thème disponible.</div>
                  )}
                  {themes.map((t) => {
                    const on = themeIds.includes(t.id);
                    return (
                      <label key={t.id} className="multi-select__opt">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleTheme(t.id)}
                        />
                        <span>{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              </details>
              {/* Tags rappelés à droite du bandeau « Billet n° 042 · carnet:2026-042 ».
                  Retrait d'un thème = ouvrir le multi-select et décocher. */}
            </div>

            <hr />
            <h3>Calendrier</h3>
            <div className="field">
              <label>Publication</label>
              <input
                type="date"
                value={isoDate(post.publishedAt)}
                onChange={(e) => patch('publishedAt', e.target.value)}
              />
            </div>
            {post.updatedAt && (
              <div className="field">
                <label>Mise à jour</label>
                <div className="auto">{isoDate(post.updatedAt)}</div>
              </div>
            )}

            <hr />
            <h3>Auto-calculé</h3>
            <div className="field">
              <label>ID Carnet</label>
              <div className="auto">{idCarnet ?? '—'}</div>
            </div>
            <div className="field">
              <label>Temps de lecture</label>
              <div className="auto">
                {post.readingTime ? `≈ ${post.readingTime} min` : '— (calculé au save)'}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
