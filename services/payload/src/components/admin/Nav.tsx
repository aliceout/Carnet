// Nav latérale custom — remplace la nav native Payload (qui empile
// les collections à plat) par la structure éditoriale du handoff :
//
//   Carnet.                          (brand Source Serif 22px)
//
//   CONTENU
//     Billets        (47)
//     Thèmes          (8)
//     Bibliographie (128)
//     Médias         (24)
//
//   PAGES
//     Pages éditoriales
//
//   RÉGLAGES
//     Utilisateurs    (3)
//     Site (global)
//
// Réf : Design/design_handoff_admin/README.md § 5 « Sidebar / nav ».
//
// Composant server : on fetch les counts via getPayload + find avec
// limit:1 (Payload renvoie totalDocs sans charger les docs). Le
// pathname actif est passé au composant client qui marque l'item.

import React from 'react';
import { getPayload } from 'payload';
import { headers } from 'next/headers';

import config from '@/payload.config';
import NavClient from './Nav.client';

async function fetchCount(
  payload: Awaited<ReturnType<typeof getPayload>>,
  collection: 'posts' | 'themes' | 'tags' | 'bibliography' | 'media' | 'users' | 'pages',
): Promise<number> {
  try {
    const res = await payload.find({
      collection,
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    return res.totalDocs;
  } catch {
    return 0;
  }
}

export default async function Nav(): Promise<React.ReactElement> {
  const payload = await getPayload({ config });

  const [posts, themes, tags, bibliography, media, users, pages] = await Promise.all([
    fetchCount(payload, 'posts'),
    fetchCount(payload, 'themes'),
    fetchCount(payload, 'tags'),
    fetchCount(payload, 'bibliography'),
    fetchCount(payload, 'media'),
    fetchCount(payload, 'users'),
    fetchCount(payload, 'pages'),
  ]);

  // Pathname courant (server-side via les headers Next) pour l'active state.
  // x-pathname est défini par un middleware Next ; en l'absence, on récupère
  // referer comme fallback.
  const hdrs = await headers();
  const activePath = hdrs.get('x-pathname') || hdrs.get('referer') || '';

  return (
    <NavClient
      activePath={activePath}
      counts={{ posts, themes, tags, bibliography, media, users, pages }}
    />
  );
}
