/**
 * Recherche fulltext sur les billets — ajout de la colonne tsvector
 * `search_vector` sur `posts` + index GIN pour des queries rapides
 * (`@@` opérateur). Backfill du tsvector pour les billets déjà
 * existants.
 *
 * La colonne est mise à jour à chaque save par un hook Payload
 * (services/payload/src/hooks/update-post-search-vector.ts), pas par
 * un trigger SQL — extraire le texte d'un body Lexical (jsonb) en
 * pl/pgsql serait ingérable.
 *
 * Cf collections/Posts.ts pour le câblage du hook,
 * lib/post-search-vector.ts pour la pondération, et
 * endpoints/posts-search.ts pour la query côté lecture.
 */

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

import { buildPostSearchVectorSQL } from '../lib/post-search-vector';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // 1) Colonne tsvector. NULL accepté pour ne pas bloquer l'add column
  //    sur une table peuplée ; le backfill ci-dessous remplit toutes
  //    les rows existantes, et le hook Payload garantit ensuite que
  //    chaque save écrit la valeur.
  await db.execute(sql`
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;
  `);

  // 2) Index GIN — l'index spécialisé pour tsvector. Sans lui, le
  //    `WHERE search_vector @@ ...` fait un seq scan ; avec, c'est
  //    quasi instantané même à plusieurs dizaines de milliers de rows.
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "posts_search_vector_idx"
      ON "posts" USING GIN ("search_vector");
  `);

  // 3) Backfill : on parcourt tous les billets via la local API Payload
  //    pour récupérer les relations (themes, tags, authors) résolues,
  //    on calcule le tsvector via le même module que le hook, puis on
  //    UPDATE row par row. La taille du corpus reste petite (centaines
  //    de billets max), donc pas besoin de batching.
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
  await db.execute(sql`DROP INDEX IF EXISTS "posts_search_vector_idx";`);
  await db.execute(sql`ALTER TABLE "posts" DROP COLUMN IF EXISTS "search_vector";`);
}
