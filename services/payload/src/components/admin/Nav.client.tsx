'use client';

// Nav.client.tsx — partie client de la nav latérale custom. Reçoit les
// counts pré-calculés du composant server et utilise usePathname()
// pour l'active state qui change quand on navigue (sans full reload).
//
// Fetch /cms/api/users/me au mount pour afficher le footer user
// (avatar carré avec initiale + displayName + rôle muted) cf maquette
// Design/design_handoff_admin/carnet-admin.html → footer sidebar.
//
// C'est aussi ici qu'on pose data-theme et data-accent sur <html> au
// mount, pour piloter le theming admin (cf custom.scss). data-theme
// est lu depuis localStorage (clé 'admin-theme') ; data-accent vient
// du global Site (Branding → Couleur d'accentuation), fetché en même
// temps que /me.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Me = {
  user?: {
    id?: number | string;
    email?: string;
    displayName?: string | null;
    role?: string;
  };
};

const ADMIN = '/cms/admin';

// Mapping hex → slug, doit rester aligné avec custom.scss.
const ACCENT_HEX_TO_SLUG: Record<string, string> = {
  '#5a3a7a': 'violet',
  '#8a3a3a': 'rouge',
  '#1f3a5a': 'bleu',
  '#3a3a3a': 'gris',
  '#2d5a3d': 'vert',
};

type Counts = {
  posts: number;
  themes: number;
  tags: number;
  bibliography: number;
  media: number;
  users: number;
  pages: number;
};

export interface Props {
  activePath: string;
  counts: Counts;
}

type NavItem = {
  label: string;
  href: string;
  count?: number;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

export default function NavClient({ activePath: serverActive, counts }: Props): React.ReactElement {
  // Pathname côté client (mis à jour par le routeur Next quand on
  // navigue sans full reload). On préfère l'état client une fois
  // hydraté ; sinon on retombe sur la valeur serveur (header).
  const clientPath = usePathname();
  const activePath = clientPath || serverActive;

  // User courant pour le footer (avatar + nom + rôle).
  const [me, setMe] = useState<Me['user'] | null>(null);
  useEffect(() => {
    fetch('/cms/api/users/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Me | null) => setMe(data?.user ?? null))
      .catch(() => setMe(null));
  }, []);

  // Theme courant (light/dark) — controlled state pour le toggle.
  // Init depuis localStorage, fallback sur prefers-color-scheme.
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    let initial: 'light' | 'dark' = 'light';
    try {
      const saved = localStorage.getItem('admin-theme');
      if (saved === 'dark' || saved === 'light') {
        initial = saved;
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        initial = 'dark';
      }
    } catch {
      /* localStorage indisponible — fallback light */
    }
    document.documentElement.setAttribute('data-theme', initial);
    setTheme(initial);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('admin-theme', next);
    } catch {
      /* idem */
    }
    setTheme(next);
  }

  // Accent depuis le global Site (Branding) → posé sur <html>
  // comme data-accent (mapping hex → slug). custom.scss lit cet attribut
  // pour appliquer la teinte à toute l'admin.
  useEffect(() => {
    fetch('/cms/api/globals/site?depth=0', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((site: { branding?: { accentColor?: string } } | null) => {
        const hex = site?.branding?.accentColor;
        const slug = hex ? ACCENT_HEX_TO_SLUG[hex] : undefined;
        document.documentElement.setAttribute('data-accent', slug ?? 'violet');
      })
      .catch(() => {
        document.documentElement.setAttribute('data-accent', 'violet');
      });
  }, []);

  const userInitial =
    (me?.displayName ?? me?.email ?? '?').trim().charAt(0).toUpperCase() || '?';
  const userName = me?.displayName?.trim() || me?.email?.split('@')[0] || '—';
  const userRole = me?.role ?? '';

  const sections: NavSection[] = [
    {
      label: 'Contenu',
      items: [
        { label: 'Billets', href: `${ADMIN}/collections/posts`, count: counts.posts },
        { label: 'Thèmes', href: `${ADMIN}/collections/themes`, count: counts.themes },
        { label: 'Bibliographie', href: `${ADMIN}/collections/bibliography`, count: counts.bibliography },
        { label: 'Tags', href: `${ADMIN}/collections/tags`, count: counts.tags },
        { label: 'Médias', href: `${ADMIN}/collections/media`, count: counts.media },
      ],
    },
    {
      label: 'Pages',
      items: [
        { label: 'Pages éditoriales', href: `${ADMIN}/collections/pages`, count: counts.pages },
        { label: 'Site (global)', href: `${ADMIN}/globals/site` },
      ],
    },
    {
      label: 'Réglages',
      items: [
        { label: 'Utilisateurs', href: `${ADMIN}/collections/users`, count: counts.users },
        { label: 'Mon compte', href: `${ADMIN}/account` },
      ],
    },
  ];

  function isActive(href: string): boolean {
    if (!activePath) return false;
    if (activePath === href) return true;
    return activePath.startsWith(href + '/');
  }

  return (
    <nav className="carnet-nav" aria-label="Navigation principale">
      <Link href={ADMIN} className="carnet-nav__brand">
        Carnet<span className="dot">.</span>
      </Link>

      {sections.map((section) => (
        <div key={section.label} className="carnet-nav__section">
          <div className="carnet-nav__section-label">{section.label}</div>
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive(item.href)
                  ? 'carnet-nav__link carnet-nav__link--active'
                  : 'carnet-nav__link'
              }
            >
              <span className="carnet-nav__link-label">{item.label}</span>
              {typeof item.count === 'number' && (
                <span className="carnet-nav__link-count">{item.count}</span>
              )}
            </Link>
          ))}
        </div>
      ))}

      <div className="carnet-nav__spacer" />

      {me && (
        <div className="carnet-nav__footer">
          <div className="carnet-nav__avatar" aria-hidden="true">
            {userInitial}
          </div>
          <div className="carnet-nav__user">
            <div className="carnet-nav__user-name">{userName}</div>
            {userRole && <div className="carnet-nav__user-role">{userRole}</div>}
          </div>
          <button
            type="button"
            className="carnet-nav__theme-toggle"
            aria-label={
              theme === 'dark'
                ? 'Passer en thème clair'
                : 'Passer en thème sombre'
            }
            title="Basculer le thème"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              // Soleil — clic = retour clair
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
              // Lune — clic = passage en dark
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>
        </div>
      )}

      <a
        className="carnet-nav__link carnet-nav__link--logout"
        href={`${ADMIN}/logout`}
      >
        <span className="carnet-nav__link-label">Se déconnecter</span>
      </a>
    </nav>
  );
}
