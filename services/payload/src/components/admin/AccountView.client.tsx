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

import CarnetTopbar from './CarnetTopbar';

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
      <CarnetTopbar
        crumbs={[{ href: '/cms/admin', label: 'Carnet' }, { label: 'Mon compte' }]}
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
        <button
          type="button"
          className="carnet-btn carnet-btn--accent"
          onClick={save}
          disabled={!dirty || saving || loading}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </CarnetTopbar>

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
            <h2 className="carnet-editview__section-title">Bibliothèque Zotero</h2>
            <ZoteroSection />
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

// ─── Section Zotero (sous-composant) ──────────────────────────────────
// Saisie de la clé API + ID de bibliothèque + type, plus actions :
// tester la connexion, sauvegarder, synchroniser maintenant, déconnecter.
//
// La clé API est masquée à la lecture (hook afterRead côté serveur la
// remplace par `••••••••XXXX`). Si l'utilisatrice tape dans le champ
// Clé API, la nouvelle valeur écrase la précédente. Si elle laisse vide,
// la clé persistée est conservée.

const API_ZOTERO = '/cms/api/users/me/zotero';

type ZoteroState = {
  apiKey?: string | null; // masqué côté serveur
  libraryId?: string | null;
  libraryType?: 'user' | 'group' | null;
  lastSyncAt?: string | null;
  lastSyncVersion?: number | null;
  lastSyncAdded?: number | null;
  lastSyncUpdated?: number | null;
  lastSyncError?: string | null;
};

type SyncResult = {
  ok: boolean;
  added: number;
  updated: number;
  errors: Array<{ key: string; reason: string }>;
  newVersion: number;
};

type TestResult = {
  ok: boolean;
  error?: string;
  itemCount?: number;
};

function ZoteroSection(): React.ReactElement {
  const [state, setState] = useState<ZoteroState>({});
  const [loaded, setLoaded] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [libraryIdInput, setLibraryIdInput] = useState('');
  const [busy, setBusy] = useState<null | 'save' | 'test' | 'sync' | 'disconnect'>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const refresh = React.useCallback(() => {
    setError(null);
    fetch('/cms/api/users/me?depth=0', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((res: { user?: { zotero?: ZoteroState } } | null) => {
        const z = res?.user?.zotero ?? {};
        setState(z);
        setLibraryIdInput(z.libraryId ?? '');
        setLoaded(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erreur inconnue.');
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasKey = !!(state.apiKey && state.apiKey.length > 0);
  const dirty =
    apiKeyInput.length > 0 ||
    libraryIdInput !== (state.libraryId ?? '');

  async function save() {
    setBusy('save');
    setError(null);
    setInfo(null);
    try {
      // libraryType: toujours 'user' (les bibliothèques de groupe sont
      // hors scope du Carnet — la biblio Zotero est intrinsèquement perso).
      const body: Record<string, unknown> = {
        libraryId: libraryIdInput.trim(),
        libraryType: 'user',
      };
      if (apiKeyInput.trim().length > 0) {
        body.apiKey = apiKeyInput.trim();
      }
      const res = await fetch(API_ZOTERO, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status} — ${t.slice(0, 200)}`);
      }
      setApiKeyInput('');
      setInfo('Configuration enregistrée.');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy('test');
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_ZOTERO}-test`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await res.json()) as TestResult;
      if (!res.ok || !data.ok) {
        setError(data.error || `Échec du test (HTTP ${res.status}).`);
        return;
      }
      setInfo(
        data.itemCount !== undefined
          ? `Connexion OK — ${data.itemCount} item${data.itemCount > 1 ? 's' : ''} dans la bibliothèque Zotero.`
          : 'Connexion OK.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setBusy(null);
    }
  }

  async function sync() {
    setBusy('sync');
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_ZOTERO}-sync`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await res.json()) as SyncResult & { error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || `Échec du sync (HTTP ${res.status}).`);
        return;
      }
      const parts: string[] = [];
      if (data.added > 0) parts.push(`${data.added} ajoutée${data.added > 1 ? 's' : ''}`);
      if (data.updated > 0) parts.push(`${data.updated} mise${data.updated > 1 ? 's' : ''} à jour`);
      if (parts.length === 0) parts.push('rien de neuf depuis Zotero');
      let msg = `Sync terminé — ${parts.join(', ')}.`;
      if (data.errors.length > 0) {
        msg += ` ${data.errors.length} item${data.errors.length > 1 ? 's' : ''} ignoré${data.errors.length > 1 ? 's' : ''} (titre, année ou auteur manquant côté Zotero).`;
      }
      setInfo(msg);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    if (typeof window === 'undefined') return;
    if (!window.confirm('Déconnecter Zotero ? La clé API sera effacée. Les références déjà importées dans le Carnet ne seront pas supprimées.')) return;
    setBusy('disconnect');
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(API_ZOTERO, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`HTTP ${res.status} — ${t.slice(0, 200)}`);
      }
      setApiKeyInput('');
      setInfo('Zotero déconnecté.');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setBusy(null);
    }
  }

  if (!loaded) {
    return <div className="carnet-zotero__loading">Chargement…</div>;
  }

  return (
    <div className="carnet-zotero">
      <p className="carnet-zotero__intro">
        Connectez votre bibliothèque Zotero pour qu’elle alimente
        automatiquement la liste de références disponibles dans le slash
        menu et le picker biblio des billets. Les modifications faites dans
        Zotero descendent au prochain sync ; les références importées sont
        en lecture seule côté Carnet.
      </p>

      <div className={`carnet-zotero__status carnet-zotero__status--${hasKey ? 'on' : 'off'}`}>
        <span className="dot" aria-hidden="true" />
        {hasKey ? 'Connecté à Zotero' : 'Non connecté'}
      </div>

      <div className="carnet-editview__row carnet-editview__row--2">
        <label className="carnet-editview__field">
          <span className="lbl">Clé API</span>
          <input
            type="password"
            value={apiKeyInput}
            placeholder={hasKey ? (state.apiKey ?? '••••••••') : 'Collez votre clé Zotero'}
            onChange={(e) => setApiKeyInput(e.target.value)}
            autoComplete="off"
          />
          <span className="hint">
            À générer sur{' '}
            <a
              href="https://www.zotero.org/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="carnet-link"
            >
              zotero.org/settings/keys
            </a>
            . Stockée chiffrée.
          </span>
        </label>

        <label className="carnet-editview__field">
          <span className="lbl">ID utilisateur Zotero</span>
          <input
            type="text"
            value={libraryIdInput}
            onChange={(e) => setLibraryIdInput(e.target.value)}
            placeholder="12345678"
          />
          <span className="hint">
            Numéro affiché en haut de{' '}
            <a
              href="https://www.zotero.org/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="carnet-link"
            >
              zotero.org/settings/keys
            </a>
            {' '}— « Your userID for use in API calls is … ».
          </span>
        </label>
      </div>

      <div className="carnet-zotero__actions">
        <button
          type="button"
          className="carnet-btn carnet-btn--accent"
          onClick={save}
          disabled={busy !== null || !dirty}
        >
          {busy === 'save' ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          type="button"
          className="carnet-btn carnet-btn--ghost"
          onClick={test}
          disabled={busy !== null}
          title="Tester la connexion Zotero (utilise les credentials enregistrés)."
        >
          {busy === 'test' ? 'Test…' : 'Tester la connexion'}
        </button>
        <button
          type="button"
          className="carnet-btn carnet-btn--accent"
          onClick={sync}
          disabled={busy !== null}
          title="Synchroniser depuis Zotero (utilise les credentials enregistrés)."
        >
          {busy === 'sync' ? 'Sync en cours…' : 'Synchroniser maintenant'}
        </button>
        {hasKey && (
          <button
            type="button"
            className="carnet-btn carnet-btn--ghost"
            onClick={disconnect}
            disabled={busy !== null}
          >
            {busy === 'disconnect' ? 'Déconnexion…' : 'Déconnecter'}
          </button>
        )}
      </div>

      {error && <div className="carnet-zotero__error">Erreur : {error}</div>}
      {info && <div className="carnet-zotero__info">{info}</div>}

      {hasKey && state.lastSyncAt && (
        <div className="carnet-zotero__last">
          <span className="lbl">Dernier sync :</span>{' '}
          <span className="mono">{isoDateTime(state.lastSyncAt)}</span>
          {(state.lastSyncAdded || state.lastSyncUpdated) && (
            <>
              {' — '}
              {state.lastSyncAdded ? `${state.lastSyncAdded} ajoutée${state.lastSyncAdded > 1 ? 's' : ''}` : null}
              {state.lastSyncAdded && state.lastSyncUpdated ? ', ' : null}
              {state.lastSyncUpdated ? `${state.lastSyncUpdated} mise${state.lastSyncUpdated > 1 ? 's' : ''} à jour` : null}
            </>
          )}
          {state.lastSyncVersion ? (
            <>
              {' '}
              · version <span className="mono">{state.lastSyncVersion}</span>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
