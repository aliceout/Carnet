'use client';

// BibliographyEditView (client) — vue Édition custom d'une référence
// bibliographique. Layout :
//
//   CarnetTopbar : crumbs Carnet / Bibliographie / [slug] + Supprimer
//                  + Sauvegarder
//   .carnet-editview__hero : h1 « Référence bibliographique » +
//                            « clé : <slug> » mono
//   section Identification : Type / Auteur·ice(s) / Année · Titre
//   section Publication    : Éditeur ou Revue · Lieu · Volume ·
//                            Collection · Pages · URL · DOI
//   section Notes          : Annotation personnelle (textarea)
//   .biblio-preview        : aperçu Chicago author-date live
//   used-in                : billets qui utilisent cette référence
//
// Fetch / save via /cms/api/bibliography/[id] (cookies de session).

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import CarnetTopbar from './CarnetTopbar';

const API_BIBLIO = '/cms/api/bibliography';
const API_POSTS = '/cms/api/posts';

type BibType = 'book' | 'chapter' | 'article' | 'paper' | 'web' | 'other';

const TYPE_LABEL: Record<BibType, string> = {
  book: 'Livre',
  chapter: 'Chapitre',
  article: 'Article',
  paper: 'Document de travail',
  web: 'Web',
  other: 'Autre',
};

type Bib = {
  id?: number | string;
  slug: string;
  type: BibType;
  author: string;
  year: number | string;
  title: string;
  publisher?: string;
  place?: string;
  volume?: string;
  journal?: string;
  pages?: string;
  url?: string;
  doi?: string;
  annotation?: string;
};

type UsedInPost = { id: number | string; numero?: number; title?: string };

const EMPTY: Bib = {
  slug: '',
  type: 'book',
  author: '',
  year: '',
  title: '',
  publisher: '',
  place: '',
  volume: '',
  journal: '',
  pages: '',
  url: '',
  doi: '',
  annotation: '',
};

function formatChicago(b: Bib): string {
  const parts: string[] = [];
  if (b.author) parts.push(b.author);
  if (b.year !== undefined && b.year !== '') parts.push(`(${b.year})`);
  if (b.title) parts.push(b.title);
  if (b.journal) parts.push(b.journal);
  if (b.volume) parts.push(b.volume);
  if (b.publisher) {
    parts.push(b.place ? `${b.place}, ${b.publisher}` : b.publisher);
  } else if (b.place) {
    parts.push(b.place);
  }
  if (b.pages) parts.push(`p. ${b.pages}`);
  return parts.filter(Boolean).join(', ') + '.';
}

function pad3(n: number | undefined): string {
  if (n === undefined || n === null) return '—';
  return String(n).padStart(3, '0');
}

export default function BibliographyEditViewClient({
  docId,
}: {
  docId: string | null;
}): React.ReactElement {
  const [data, setData] = useState<Bib>(EMPTY);
  const [initial, setInitial] = useState<string>(JSON.stringify(EMPTY));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [usedIn, setUsedIn] = useState<UsedInPost[]>([]);

  useEffect(() => {
    if (!docId) {
      setLoading(false);
      setInitial(JSON.stringify(EMPTY));
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${API_BIBLIO}/${encodeURIComponent(docId)}?depth=0`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((doc: Bib) => {
        const norm: Bib = {
          ...EMPTY,
          ...doc,
          // Normalise les undefined en chaînes vides pour les inputs
          slug: doc.slug ?? '',
          author: doc.author ?? '',
          title: doc.title ?? '',
          year: doc.year ?? '',
          publisher: doc.publisher ?? '',
          place: doc.place ?? '',
          volume: doc.volume ?? '',
          journal: doc.journal ?? '',
          pages: doc.pages ?? '',
          url: doc.url ?? '',
          doi: doc.doi ?? '',
          annotation: doc.annotation ?? '',
        };
        setData(norm);
        setInitial(JSON.stringify(norm));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
      .finally(() => setLoading(false));

    // Fetch used-in posts
    fetch(
      `${API_POSTS}?where[bibliography][in]=${encodeURIComponent(docId)}&limit=50&depth=0&sort=-publishedAt`,
      { credentials: 'include' },
    )
      .then((r) => (r.ok ? r.json() : { docs: [] }))
      .then((res: { docs?: UsedInPost[] }) => setUsedIn(res.docs ?? []))
      .catch(() => setUsedIn([]));
  }, [docId]);

  const dirty = JSON.stringify(data) !== initial;

  function patch<K extends keyof Bib>(key: K, value: Bib[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = { ...data };
      const url =
        data.id != null && data.id !== ''
          ? `${API_BIBLIO}/${encodeURIComponent(String(data.id))}`
          : API_BIBLIO;
      const method = data.id != null && data.id !== '' ? 'PATCH' : 'POST';
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
      const json = (await res.json()) as { doc?: Bib } | Bib;
      const fresh: Bib = (json as { doc?: Bib }).doc ?? (json as Bib);
      const norm: Bib = { ...EMPTY, ...fresh };
      setData(norm);
      setInitial(JSON.stringify(norm));
      setSavedAt(Date.now());
      if (!docId && fresh.id != null) {
        const path = `/cms/admin/collections/bibliography/${fresh.id}`;
        if (typeof window !== 'undefined') window.history.replaceState(null, '', path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!data.id) return;
    if (typeof window === 'undefined') return;
    const ok = window.confirm(
      `Supprimer définitivement la référence « ${data.slug || data.title || data.id} » ?`,
    );
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BIBLIO}/${encodeURIComponent(String(data.id))}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      window.location.href = '/cms/admin/collections/bibliography';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setDeleting(false);
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
  }, [dirty, saving, data]);

  // Pour articles / papers : « Numéro » à la place de « Collection »
  const isJournalLike = data.type === 'article' || data.type === 'paper';
  const middleFieldLabel = isJournalLike ? 'Numéro' : 'Collection';

  return (
    <div className="carnet-editview carnet-editview--biblio">
      <CarnetTopbar
        crumbs={[
          { href: '/cms/admin', label: 'Carnet' },
          { href: '/cms/admin/collections/bibliography', label: 'Bibliographie' },
          { label: data.slug || (docId ? '—' : 'nouvelle') },
        ]}
        suppressHydrationWarningOnActions
      >
        {dirty && (
          <span className="carnet-editview__dirty" aria-live="polite">
            Modifications non enregistrées
          </span>
        )}
        {!dirty && savedAt && (
          <span className="carnet-editview__saved" aria-live="polite">
            Enregistré
          </span>
        )}
        {data.id != null && (
          <button
            type="button"
            className="carnet-btn carnet-btn--ghost"
            onClick={() => void remove()}
            disabled={deleting || saving}
            suppressHydrationWarning
          >
            {deleting ? 'Suppression…' : 'Supprimer'}
          </button>
        )}
        <button
          type="button"
          className="carnet-btn carnet-btn--accent"
          onClick={() => void save()}
          disabled={!dirty || saving || loading}
          title="Sauvegarder"
          suppressHydrationWarning
        >
          {saving ? 'Enregistrement…' : 'Sauvegarder'}
        </button>
      </CarnetTopbar>

      {error && <div className="carnet-editview__error">Erreur : {error}</div>}

      {loading ? (
        <div className="carnet-editview__loading">Chargement…</div>
      ) : (
        <form
          className="carnet-editview__form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="carnet-editview__hero">
            <h1 className="carnet-h1">Référence bibliographique</h1>
            {data.slug && (
              <p className="carnet-editview__hero-key">
                clé : <span className="mono">{data.slug}</span>
              </p>
            )}
          </div>

          <section className="carnet-editview__section">
            <h2 className="carnet-editview__section-title">Identification</h2>

            <div className="carnet-editview__row carnet-editview__row--3">
              <label className="carnet-editview__field">
                <span className="lbl">Type</span>
                <select
                  value={data.type}
                  onChange={(e) => patch('type', e.target.value as BibType)}
                >
                  {(Object.keys(TYPE_LABEL) as BibType[]).map((k) => (
                    <option key={k} value={k}>
                      {TYPE_LABEL[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="carnet-editview__field">
                <span className="lbl">Auteur·ice(s)</span>
                <input
                  type="text"
                  value={data.author}
                  onChange={(e) => patch('author', e.target.value)}
                  placeholder="Nom, Prénom ; …"
                />
              </label>
              <label className="carnet-editview__field">
                <span className="lbl">Année</span>
                <input
                  type="number"
                  value={data.year === '' ? '' : data.year}
                  min={1700}
                  max={3000}
                  onChange={(e) =>
                    patch('year', e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
              </label>
            </div>

            <label className="carnet-editview__field">
              <span className="lbl">Titre</span>
              <input
                type="text"
                value={data.title}
                onChange={(e) => patch('title', e.target.value)}
              />
            </label>

            <label className="carnet-editview__field">
              <span className="lbl">Slug</span>
              <input
                type="text"
                value={data.slug}
                onChange={(e) => patch('slug', e.target.value)}
                placeholder="farris-2017"
              />
              <span className="hint">
                Clé courte, sert d’ancre <span className="mono">#bib-…</span> côté article.
              </span>
            </label>
          </section>

          <section className="carnet-editview__section">
            <h2 className="carnet-editview__section-title">Publication</h2>

            <div className="carnet-editview__row carnet-editview__row--2">
              <label className="carnet-editview__field">
                <span className="lbl">Éditeur / Revue</span>
                <input
                  type="text"
                  value={data.publisher ?? ''}
                  onChange={(e) => patch('publisher', e.target.value)}
                />
              </label>
              <label className="carnet-editview__field">
                <span className="lbl">Lieu</span>
                <input
                  type="text"
                  value={data.place ?? ''}
                  onChange={(e) => patch('place', e.target.value)}
                />
              </label>
            </div>

            <div className="carnet-editview__row carnet-editview__row--3">
              <label className="carnet-editview__field">
                <span className="lbl">Volume</span>
                <input
                  type="text"
                  value={data.volume ?? ''}
                  onChange={(e) => patch('volume', e.target.value)}
                />
              </label>
              <label className="carnet-editview__field">
                <span className="lbl">{middleFieldLabel}</span>
                <input
                  type="text"
                  value={data.journal ?? ''}
                  onChange={(e) => patch('journal', e.target.value)}
                />
              </label>
              <label className="carnet-editview__field">
                <span className="lbl">Pages</span>
                <input
                  type="text"
                  value={data.pages ?? ''}
                  onChange={(e) => patch('pages', e.target.value)}
                  placeholder="43-82"
                />
              </label>
            </div>

            <div className="carnet-editview__row carnet-editview__row--2">
              <label className="carnet-editview__field">
                <span className="lbl">URL</span>
                <input
                  type="url"
                  value={data.url ?? ''}
                  onChange={(e) => patch('url', e.target.value)}
                />
              </label>
              <label className="carnet-editview__field">
                <span className="lbl">DOI</span>
                <input
                  type="text"
                  value={data.doi ?? ''}
                  onChange={(e) => patch('doi', e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="carnet-editview__section">
            <h2 className="carnet-editview__section-title">Notes</h2>

            <label className="carnet-editview__field">
              <span className="lbl">Annotation personnelle</span>
              <textarea
                rows={4}
                value={data.annotation ?? ''}
                onChange={(e) => patch('annotation', e.target.value)}
              />
              <span className="hint">
                Optionnel — note de lecture, raison de l’inclusion, mémo de contexte.
                Non publié.
              </span>
            </label>
          </section>

          <div className="carnet-biblio-preview">
            <div className="carnet-biblio-preview__lbl">Aperçu (style biblio)</div>
            <div className="carnet-biblio-preview__body">{formatChicago(data)}</div>
          </div>

          {data.id != null && (
            <div className="carnet-biblio-usedin">
              {usedIn.length === 0 ? (
                <span>Cette référence n’est utilisée dans aucun billet pour l’instant.</span>
              ) : (
                <>
                  Utilisée dans {usedIn.length} billet{usedIn.length > 1 ? 's' : ''} :{' '}
                  {usedIn.map((p, i) => (
                    <React.Fragment key={p.id}>
                      {i > 0 && ', '}
                      <Link href={`/cms/admin/collections/posts/${p.id}`}>
                        n°&nbsp;{pad3(p.numero)}
                      </Link>
                    </React.Fragment>
                  ))}
                </>
              )}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
