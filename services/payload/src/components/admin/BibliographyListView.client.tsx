'use client';

// BibliographyListView (client) — vue Liste custom Bibliographie :
// recherche + filtre par type, tableau slug/auteur/année/titre/type.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import CarnetTopbar from './CarnetTopbar';

const PER_PAGE = 25;

type BiblioEntry = {
  id: number | string;
  slug: string;
  author: string;
  year: number;
  title: string;
  type: string;
  publisher?: string;
};

type FetchResult<T> = {
  docs: T[];
  totalDocs: number;
  page: number;
  totalPages: number;
};

type FilterType = 'all' | 'book' | 'chapter' | 'article' | 'paper' | 'web' | 'other';

const TYPE_LABEL: Record<Exclude<FilterType, 'all'>, string> = {
  book: 'Livre',
  chapter: 'Chapitre',
  article: 'Article',
  paper: 'Working paper',
  web: 'Web',
  other: 'Autre',
};

export default function BibliographyListViewClient(): React.ReactElement {
  const [entries, setEntries] = useState<BiblioEntry[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<FilterType>('all');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('limit', String(PER_PAGE));
    params.set('page', String(page));
    params.set('sort', 'author');
    params.set('depth', '0');
    if (search.trim()) params.append('where[author][like]', search.trim());
    if (type !== 'all') params.append('where[type][equals]', type);

    fetch(`/cms/api/bibliography?${params.toString()}`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: FetchResult<BiblioEntry>) => {
        setEntries(data.docs ?? []);
        setTotalDocs(data.totalDocs ?? 0);
        setTotalPages(data.totalPages ?? 1);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setEntries([]);
      })
      .finally(() => setLoading(false));
  }, [page, search, type]);

  useEffect(() => setPage(1), [search, type]);

  const startIdx = (page - 1) * PER_PAGE + 1;
  const endIdx = Math.min(page * PER_PAGE, totalDocs);

  return (
    <div className="carnet-listview carnet-listview--biblio">
      <CarnetTopbar
        crumbs={[{ href: '/cms/admin', label: 'Carnet' }, { label: 'Bibliographie' }]}
      >
        <Link
          href="/cms/admin/collections/bibliography/create"
          className="carnet-btn carnet-btn--accent"
        >
          Nouvelle référence
        </Link>
      </CarnetTopbar>

      <div className="carnet-listview__toolbar">
        <div className="carnet-listview__search">
          <span className="ic" aria-hidden="true">
            ⌕
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Rechercher par auteur dans ${totalDocs} référence${totalDocs > 1 ? 's' : ''}…`}
          />
        </div>
        <label className="carnet-listview__filter">
          <span className="lbl">Type :</span>
          <select value={type} onChange={(e) => setType(e.target.value as FilterType)}>
            <option value="all">tous</option>
            <option value="book">Livre</option>
            <option value="chapter">Chapitre</option>
            <option value="article">Article</option>
            <option value="paper">Working paper</option>
            <option value="web">Web</option>
            <option value="other">Autre</option>
          </select>
        </label>
      </div>

      {error && <div className="carnet-listview__error">Erreur : {error}</div>}

      <div className="carnet-listview__table" role="table">
        <div className="carnet-listview__row carnet-listview__row--head" role="row">
          <div role="columnheader">Clé</div>
          <div role="columnheader">Auteur</div>
          <div role="columnheader">Année</div>
          <div role="columnheader">Titre</div>
          <div role="columnheader">Type</div>
        </div>

        {loading && entries.length === 0 ? (
          <div className="carnet-listview__loading">Chargement…</div>
        ) : entries.length === 0 ? (
          <div className="carnet-listview__empty">Aucune référence.</div>
        ) : (
          entries.map((b) => (
            <Link
              key={b.id}
              href={`/cms/admin/collections/bibliography/${b.id}`}
              className="carnet-listview__row"
              role="row"
            >
              <div role="cell" className="slug">
                {b.slug}
              </div>
              <div role="cell" className="author">
                {b.author}
              </div>
              <div role="cell" className="year">
                {b.year}
              </div>
              <div role="cell" className="title">
                {b.title}
              </div>
              <div role="cell" className="type-cell">
                {TYPE_LABEL[b.type as Exclude<FilterType, 'all'>] ?? b.type}
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="carnet-listview__pagination">
        <span className="carnet-listview__pagination-info">
          {totalDocs === 0
            ? 'Aucun résultat'
            : `Affichage ${startIdx}–${endIdx} sur ${totalDocs} · ${PER_PAGE} par page`}
        </span>
        {totalPages > 1 && (
          <div className="carnet-listview__pagination-pages">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Page précédente"
            >
              ←
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={n === page ? 'on' : ''}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Page suivante"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
