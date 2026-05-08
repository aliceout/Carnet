/**
 * Flux RSS du Carnet — /rss.xml
 *
 * Liste des billets non-draft, triés par date décroissante. Limite : 50.
 * Description = lede du billet (chapô). Catégories = thèmes (slugs).
 */
import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';

import { fetchCollection, filterPublished } from '../lib/payload';

type Theme = { id: number | string; slug: string; name: string };

type Post = {
  id: number | string;
  numero: number;
  slug: string;
  title: string;
  themes?: Theme[] | null;
  publishedAt: string;
  lede: string;
  draft?: boolean;
};

export const GET: APIRoute = async (context) => {
  let posts: Post[] = [];
  try {
    const raw = await fetchCollection<Post>('posts', {
      sort: '-publishedAt',
      limit: 50,
      depth: 1,
    });
    posts = filterPublished(raw);
  } catch (err) {
    console.warn('[rss] fetch failed:', (err as Error).message);
  }

  if (!context.site) {
    throw new Error(
      "rss.xml.ts: context.site est undefined — vérifie que `site` est défini dans astro.config.mjs.",
    );
  }
  return rss({
    title: 'Carnet — notes de recherche',
    description: 'Carnet de recherche. Auto-hébergé. Sans pisteur.',
    site: context.site,
    items: posts.map((p) => {
      const themes = (p.themes ?? []).filter(
        (t): t is Theme => typeof t === 'object' && t !== null && 'slug' in t,
      );
      return {
        title: p.title,
        link: `/billets/${p.slug}/`,
        pubDate: new Date(p.publishedAt),
        description: p.lede,
        categories: themes.map((t) => t.slug),
      };
    }),
    customData: '<language>fr-FR</language>',
    stylesheet: false,
  });
};
