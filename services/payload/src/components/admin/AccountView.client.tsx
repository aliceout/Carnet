'use client';

// AccountView (client) — page Mon compte custom qui matche le langage
// visuel de l'admin Carnet (cf .carnet-listview / .carnet-btn).
//
// Layout :
//   - Header : crumbs « Carnet / Mon compte », actions Save accent
//   - Section Profil : displayName (éditable), email (read-only),
//     rôle (chip), statut (chip), dernière connexion (read-only)
//   - Section Sécurité : embed AccountSecurity (2FA, trusted devices)
//
// Fetch via /cms/api/users/me (cookies de session). Save via
// PATCH /cms/api/users/[id] avec uniquement les champs éditables
// (displayName) — les autres champs sont envoyés en read-only.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import AccountSecurity from '@/components/auth/AccountSecurity.client';

const API_USERS = '/cms/api/users';

type UserRole = 'root' | 'admin' | 'editor';
type UserStatus = 'pending' | 'active' | 'disabled';

type Me = {
  id: number | string;
  email: string;
  displayName?: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string | null;
};

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

function isoDateTime(d?: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AccountViewClient(): React.ReactElement {
  const [me, setMe] = useState<Me | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [initialDisplayName, setInitialDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_USERS}/me?depth=0`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res: { user?: Me } | Me) => {
        const u = (res as { user?: Me }).user ?? (res as Me);
        setMe(u);
        const name = u.displayName ?? '';
        setDisplayName(name);
        setInitialDisplayName(name);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      })
      .finally(() => setLoading(false));
  }, []);

  const dirty = displayName !== initialDisplayName;

  async function save() {
    if (!me) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_USERS}/${encodeURIComponent(String(me.id))}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status} — ${body.slice(0, 200)}`);
      }
      setInitialDisplayName(displayName);
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="carnet-editview carnet-editview--account">
      <header className="carnet-editview__header">
        <div className="carnet-editview__crumbs">
          <Link href="/cms/admin">Carnet</Link>
          <span className="sep" aria-hidden="true">
            /
          </span>
          <span className="cur">Mon compte</span>
        </div>
        <div className="carnet-editview__actions">
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
          <button
            type="button"
            className="carnet-btn carnet-btn--accent"
            onClick={save}
            disabled={!dirty || saving || loading}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </header>

      {error && <div className="carnet-editview__error">Erreur : {error}</div>}

      {loading || !me ? (
        <div className="carnet-editview__loading">Chargement…</div>
      ) : (
        <form
          className="carnet-editview__form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <section className="carnet-editview__section">
            <h2 className="carnet-editview__section-title">Profil</h2>

            <label className="carnet-editview__field">
              <span className="lbl">Nom affiché</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <span className="hint">Affiché dans la nav et les en-têtes admin.</span>
            </label>

            <label className="carnet-editview__field carnet-editview__field--readonly">
              <span className="lbl">Email</span>
              <input type="email" value={me.email} readOnly disabled />
              <span className="hint">
                Le changement d&apos;email passe par le support — pas modifiable ici.
              </span>
            </label>

            <div className="carnet-editview__readonly-grid">
              <div className="carnet-editview__readonly">
                <span className="lbl">Rôle</span>
                <span className={`carnet-role carnet-role--${me.role}`}>
                  {ROLE_LABEL[me.role]}
                </span>
              </div>
              <div className="carnet-editview__readonly">
                <span className="lbl">Statut</span>
                <span className={`carnet-status carnet-status--${me.status}`}>
                  <span className="carnet-status__dot" aria-hidden="true" />
                  {STATUS_LABEL[me.status]}
                </span>
              </div>
              <div className="carnet-editview__readonly">
                <span className="lbl">Dernière connexion</span>
                <span className="carnet-editview__readonly-value mono">
                  {isoDateTime(me.lastLoginAt)}
                </span>
              </div>
            </div>
          </section>

          <section className="carnet-editview__section">
            <h2 className="carnet-editview__section-title">Sécurité</h2>
            <AccountSecurity />
          </section>
        </form>
      )}
    </div>
  );
}
