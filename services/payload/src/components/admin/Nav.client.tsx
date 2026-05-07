'use client';

// Nav.client.tsx — partie client de la nav latérale custom. Reçoit les
// counts pré-calculés du composant server et utilise usePathname()
// pour l'active state qui change quand on navigue (sans full reload).

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ADMIN = '/cms/admin';

type Counts = {
  posts: number;
  themes: number;
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

  const sections: NavSection[] = [
    {
      label: 'Contenu',
      items: [
        { label: 'Billets', href: `${ADMIN}/collections/posts`, count: counts.posts },
        { label: 'Thèmes', href: `${ADMIN}/collections/themes`, count: counts.themes },
        { label: 'Bibliographie', href: `${ADMIN}/collections/bibliography`, count: counts.bibliography },
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

      <a
        className="carnet-nav__link carnet-nav__link--logout"
        href={`${ADMIN}/logout`}
      >
        <span className="carnet-nav__link-label">Se déconnecter</span>
      </a>
    </nav>
  );
}
