'use client';

// PostListView (client) — vue Liste custom Posts qui matche le handoff
// admin (cf Design/design_handoff_admin/carnet-admin.html → ScreenList).
//
// Layout :
//   - Header : crumbs « Carnet / Billets », actions à droite (Exporter,
//     Nouveau billet ⌘N en accent)
//   - Titre h1 « Billets »
//   - Toolbar : recherche + 4 filtres dropdowns (Type / Pôle / Statut / Tri)
//   - Tableau custom (N° / Date / Type / Pôle / Titre / Statut chip)
//   - Pagination « Affichage 1-25 sur 47 · 25 par page » + flèches + pages
//
// Fetch via /cms/api/posts (cookies de session inclus). Filtres côté
// client, refetch à chaque changement.

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import CarnetTopbar from './CarnetTopbar';

const PER_PAGE = 25;

type Theme = { id: number | string; slug: string; name: string };
type Post = {
  id: number | string;
  numero?: number;
  title: string;
  slug: string;
  type: 'analyse' | 'note' | 'fiche';
  themes?: Theme[] | null;
  publishedAt: string;
  draft?: boolean;
};

type FetchResult = {
  docs: Post[];
  totalDocs: number;
  page: number;
  totalPages: number;
};

type FilterType = 'all' | 'analyse' | 'note' | 'fiche';
type FilterStatut = 'all' | 'draft' | 'published' | 'scheduled';
type SortKey = '-publishedAt' | 'publishedAt' | '-numero' | 'numero';

const TYPE_LABELS: Record<Post['type'], string> = {
  analyse: 'Article',
  note: 'Note de lecture',
  fiche: 'Fiche',
};

function pad3(n: number | string | undefined): string {
  if (n === undefined || n === null || n === '') return '—';
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  if (Number.isNaN(num)) return String(n);
  return String(num).padStart(3, '0');
}

function isoDate(d: string): string {
  if (!d) return '—';
  return d.slice(0, 10);
}

function inferStatus(p: Post): 'draft' | 'scheduled' | 'published' {
  if (p.draft) return 'draft';
  if (p.publishedAt && new Date(p.publishedAt).getTime() > Date.now()) return 'scheduled';
  return 'published';
}

const STATUS_LABEL: Record<'draft' | 'scheduled' | 'published', string> = {
  draft: 'Brouillon',
  scheduled: 'Planifié',
  published: 'Publié',
};

export default function PostListViewClient(): React.ReactElement {
  const [type, setType] = useState<FilterType>('all');
  const [pole, setPole] = useState<string>('all');
  const [statut, setStatut] = useState<FilterStatut>('all');
  const [sort, setSort] = useState<SortKey>('-publishedAt');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [posts, setPosts] = useState<Post[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [themes, setThemes] = useState<Theme[]>([]);

  // Fetch initial des thèmes (pour le filtre Pôle)
  useEffect(() => {
    fetch('/cms/api/themes?limit=100&depth=0&sort=name', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: { docs: Theme[] }) => setThemes(data.docs ?? []))
      .catch(() => setThemes([]));
  }, []);

  // Fetch des posts à chaque changement de filtre/tri/page
  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('limit', String(PER_PAGE));
    params.set('page', String(page));
    params.set('depth', '1');
    params.set('sort', sort);

    if (type !== 'all') {
      params.append('where[type][equals]', type);
    }
    if (pole !== 'all') {
      params.append('where[themes.slug][equals]', pole);
    }
    if (statut === 'draft') {
      params.append('where[draft][equals]', 'true');
    } else if (statut === 'published') {
      params.append('where[draft][equals]', 'false');
      params.append('where[publishedAt][less_than_equal]', new Date().toISOString());
    } else if (statut === 'scheduled') {
      params.append('where[draft][equals]', 'false');
      params.append('where[publishedAt][greater_than]', new Date().toISOString());
    }
    if (search.trim()) {
      params.append('where[title][like]', search.trim());
    }

    fetch(`/cms/api/posts?${params.toString()}`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: FetchResult) => {
        setPosts(data.docs ?? []);
        setTotalDocs(data.totalDocs ?? 0);
        setTotalPages(data.totalPages ?? 1);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [type, pole, statut, sort, page, search]);

  // Reset page=1 quand un filtre change (sinon on peut être sur p2 d'un filtre vide)
  useEffect(() => {
    setPage(1);
  }, [type, pole, statut, sort, search]);

  const themeOptions = useMemo(
    () => [{ slug: 'all', name: 'tous' }, ...themes],
    [themes],
  );

  const startIdx = (page - 1) * PER_PAGE + 1;
  const endIdx = Math.min(page * PER_PAGE, totalDocs);

  return (
    <div className="carnet-listview">
      <CarnetTopbar
        crumbs={[{ href: '/cms/admin', label: 'Carnet' }, { label: 'Billets' }]}
      >
        <button
          type="button"
          className="carnet-btn carnet-btn--ghost"
          onClick={() => alert('Export à venir (issue v2)')}
        >
          Exporter
        </button>
        <Link
          href="/cms/admin/collections/posts/create"
          className="carnet-btn carnet-btn--accent"
        >
          Nouveau billet
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
            placeholder={`Rechercher dans ${totalDocs} billet${totalDocs > 1 ? 's' : ''}…`}
          />
        </div>

        <label className="carnet-listview__filter">
          <span className="lbl">Type :</span>
          <select value={type} onChange={(e) => setType(e.target.value as FilterType)}>
            <option value="all">tous</option>
            <option value="analyse">Analyse</option>
            <option value="note">Note de lecture</option>
            <option value="fiche">Fiche</option>
          </select>
        </label>

        <label className="carnet-listview__filter">
          <span className="lbl">Thème :</span>
          <select value={pole} onChange={(e) => setPole(e.target.value)}>
            {themeOptions.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <label className="carnet-listview__filter">
          <span className="lbl">Statut :</span>
          <select value={statut} onChange={(e) => setStatut(e.target.value as FilterStatut)}>
            <option value="all">tous</option>
            <option value="draft">Brouillon</option>
            <option value="scheduled">Planifié</option>
            <option value="published">Publié</option>
          </select>
        </label>

        <label className="carnet-listview__filter">
          <span className="lbl">Tri :</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="-publishedAt">récent</option>
            <option value="publishedAt">ancien</option>
            <option value="-numero">n° décroissant</option>
            <option value="numero">n° croissant</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="carnet-listview__error">Erreur : {error}</div>
      )}

      <div className="carnet-listview__table" role="table">
        <div className="carnet-listview__row carnet-listview__row--head" role="row">
          <div role="columnheader">N°</div>
          <div role="columnheader">Date</div>
          <div role="columnheader">Type</div>
          <div role="columnheader">Thème</div>
          <div role="columnheader">Titre</div>
          <div role="columnheader">Statut</div>
        </div>

        {loading && posts.length === 0 ? (
          <div className="carnet-listview__loading">Chargement…</div>
        ) : posts.length === 0 ? (
          <div className="carnet-listview__empty">Aucun billet ne correspond aux filtres.</div>
        ) : (
          posts.map((p) => {
            const status = inferStatus(p);
            const primaryTheme = (p.themes ?? [])[0];
            return (
              <Link
                key={p.id}
                href={`/cms/admin/collections/posts/${p.id}`}
                className="carnet-listview__row"
                role="row"
              >
                <div role="cell" className="num">
                  n° {pad3(p.numero)}
                </div>
                <div role="cell" className="date">
                  {isoDate(p.publishedAt)}
                </div>
                <div role="cell" className="type">
                  {TYPE_LABELS[p.type]}
                </div>
                <div role="cell" className="theme">
                  {primaryTheme?.name ?? '—'}
                </div>
                <div role="cell" className="title">
                  {p.title}
                </div>
                <div role="cell" className="status">
                  <span className={`carnet-status carnet-status--${status}`}>
                    <span className="carnet-status__dot" aria-hidden="true" />
                    {STATUS_LABEL[status]}
                  </span>
                </div>
              </Link>
            );
          })
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
