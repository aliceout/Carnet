/**
 * Backfill de la colonne `posts.search_vector` (FTS Postgres) pour
 * tous les billets existants au moment de l'application.
 *
 * Migration séparée de la création de la colonne (cf migration auto-
 * générée par le pre-commit hook qui tourne juste avant celle-ci) :
 *  - La création column+index est purement structurelle, gérée par
 *    Drizzle via le schéma déclaré (afterSchemaInit) + auto-gen.
 *  - Le backfill nécessite la local API Payload pour résoudre les
 *    relations (themes, tags, authors) — pas exprimable en SQL pur,
 *    donc dans une migration manuelle.
 *
 * Idempotent : on UPDATE row par row. Si la migration est rejouée
 * (rare en prod), le tsvector est juste recalculé à l'identique.
 *
 * Pattern aligné sur la migration 20260508_214735_backfill (qui fait
 * un backfill similaire pour zoteroKey / source des biblio).
 */

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

import { buildPostSearchVectorSQL } from '../lib/post-search-vector';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  const all = await payload.find({
    collection: 'posts',
    limit: 5000,
    depth: 1,
    overrideAccess: true,
    pagination: false,
    req,
  });

  type ResolvedRelation = { name?: string | null } | { displayName?: string | null; email?: string | null };
  const relName = (r: unknown): string => {
    if (!r || typeof r !== 'object') return '';
    const o = r as ResolvedRelation;
    if ('name' in o && typeof o.name === 'string') return o.name;
    if ('displayName' in o && typeof o.displayName === 'string' && o.displayName.trim()) {
      return o.displayName;
    }
    if ('email' in o && typeof o.email === 'string') return o.email;
    return '';
  };
  const authorName = (a: { kind?: 'user' | 'external'; user?: unknown; name?: string | null }): string => {
    if (a.kind === 'external') return (a.name ?? '').toString();
    return relName(a.user);
  };

  for (const post of all.docs) {
    const themeNames = (Array.isArray(post.themes) ? post.themes : []).map(relName).filter(Boolean);
    const tagNames = (Array.isArray((post as { tags?: unknown[] }).tags) ? (post as { tags: unknown[] }).tags : [])
      .map(relName)
      .filter(Boolean);
    const authorNames = (Array.isArray((post as { authors?: unknown[] }).authors)
      ? ((post as { authors: unknown[] }).authors as Array<{ kind?: 'user' | 'external'; user?: unknown; name?: string | null }>)
      : []
    )
      .map(authorName)
      .filter(Boolean);

    const vectorSQL = buildPostSearchVectorSQL({
      title: post.title as string | null | undefined,
      lede: (post as { lede?: string | null }).lede,
      body: (post as { body?: unknown }).body,
      slug: (post as { slug?: string | null }).slug,
      idCarnet: (post as { idCarnet?: string | null }).idCarnet,
      themeNames,
      tagNames,
      authorNames,
    });

    await db.execute(sql`UPDATE "posts" SET "search_vector" = ${vectorSQL} WHERE "id" = ${post.id}`);
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Le down ne défait pas le backfill — il met juste les vecteurs
  // à NULL au cas où (cohérent avec un down qui rollback la migration
  // de schéma juste avant, qui dropera la colonne de toute façon).
  await db.execute(sql`UPDATE "posts" SET "search_vector" = NULL`);
}
