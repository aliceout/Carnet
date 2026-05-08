'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import CarnetTopbar from './CarnetTopbar';

const PER_PAGE = 25;

type UserRole = 'root' | 'admin' | 'editor';
type UserStatus = 'pending' | 'active' | 'disabled';

type User = {
  id: number | string;
  email: string;
  displayName?: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string | null;
  updatedAt: string;
};

type FetchResult<T> = {
  docs: T[];
  totalDocs: number;
  page: number;
  totalPages: number;
};

type FilterRole = 'all' | UserRole;

const ROLE_LABEL: Record<UserRole, string> = {
  root: 'Root',
  admin: 'Admin',
  editor: 'Éditeur·ice',
};

const STATUS_LABEL: Record<UserStatus, string> = {
  pending: 'En attente',
  active: 'Actif',
  disabled: 'Désactivé',
};

function isoDate(d?: string | null): string {
  if (!d) return '—';
  return d.slice(0, 10);
}

export default function UsersListViewClient(): React.ReactElement {
  const [users, setUsers] = useState<User[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<FilterRole>('all');

  // Bouton « Inviter » — appelle l'endpoint custom invitations
  // déjà en place côté Payload (cf services/payload/src/auth/endpoints/
  // invitations.ts). Pour l'instant on redirige vers la page d'invitation
  // native si Payload en a une, sinon on affiche un placeholder.
  const inviteHref = '/cms/admin/collections/users/create';

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('limit', String(PER_PAGE));
    params.set('page', String(page));
    params.set('sort', '-updatedAt');
    params.set('depth', '0');
    if (search.trim()) params.append('where[email][like]', search.trim());
    if (role !== 'all') params.append('where[role][equals]', role);

    fetch(`/cms/api/users?${params.toString()}`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: FetchResult<User>) => {
        setUsers(data.docs ?? []);
        setTotalDocs(data.totalDocs ?? 0);
        setTotalPages(data.totalPages ?? 1);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, [page, search, role]);

  useEffect(() => setPage(1), [search, role]);

  const startIdx = (page - 1) * PER_PAGE + 1;
  const endIdx = Math.min(page * PER_PAGE, totalDocs);

  return (
    <div className="carnet-listview carnet-listview--users">
      <CarnetTopbar
        crumbs={[{ href: '/cms/admin', label: 'Carnet' }, { label: 'Utilisateurs' }]}
      >
        <Link href={inviteHref} className="carnet-btn carnet-btn--accent">
          Inviter un·e utilisateur·ice
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
            placeholder={`Rechercher dans ${totalDocs} utilisateur·ice${totalDocs > 1 ? 's' : ''}…`}
          />
        </div>
        <label className="carnet-listview__filter">
          <span className="lbl">Rôle :</span>
          <select value={role} onChange={(e) => setRole(e.target.value as FilterRole)}>
            <option value="all">tous</option>
            <option value="root">Root</option>
            <option value="admin">Admin</option>
            <option value="editor">Éditeur·ice</option>
          </select>
        </label>
      </div>

      {error && <div className="carnet-listview__error">Erreur : {error}</div>}

      <div className="carnet-listview__table" role="table">
        <div className="carnet-listview__row carnet-listview__row--head" role="row">
          <div role="columnheader">Email</div>
          <div role="columnheader">Nom affiché</div>
          <div role="columnheader">Rôle</div>
          <div role="columnheader">Statut</div>
          <div role="columnheader">Dernière connexion</div>
        </div>

        {loading && users.length === 0 ? (
          <div className="carnet-listview__loading">Chargement…</div>
        ) : users.length === 0 ? (
          <div className="carnet-listview__empty">Aucun utilisateur·ice.</div>
        ) : (
          users.map((u) => (
            <Link
              key={u.id}
              href={`/cms/admin/collections/users/${u.id}`}
              className="carnet-listview__row"
              role="row"
            >
              <div role="cell" className="email">
                {u.email}
              </div>
              <div role="cell" className="name">
                {u.displayName?.trim() || '—'}
              </div>
              <div role="cell" className="role">
                <span className={`carnet-role carnet-role--${u.role}`}>
                  {ROLE_LABEL[u.role]}
                </span>
              </div>
              <div role="cell" className="status-cell">
                <span className={`carnet-status carnet-status--${u.status}`}>
                  <span className="carnet-status__dot" aria-hidden="true" />
                  {STATUS_LABEL[u.status]}
                </span>
              </div>
              <div role="cell" className="date">
                {isoDate(u.lastLoginAt)}
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
