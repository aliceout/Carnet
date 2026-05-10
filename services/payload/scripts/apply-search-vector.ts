/**
 * Script one-shot — applique uniquement la migration search_vector
 * sur le dev DB, sans passer par `payload migrate`.
 *
 * Pourquoi : en dev `push: true` synchronise le schéma à chaque boot
 * Payload, mais ne touche pas la table `payload_migrations`. Quand
 * on lance `pnpm migrate`, Payload voit aucune migration appliquée
 * et tente de rejouer la première (initial_schema) → plante sur
 * « type enum_posts_type already exists ».
 *
 * Plutôt que de marquer les 9 migrations comme appliquées à la main,
 * on appelle juste l'`up` de la migration search_vector qui est
 * idempotent (IF NOT EXISTS sur la colonne et l'index, backfill
 * sur tous les billets). Sûr à relancer.
 *
 * Usage : pnpm apply:search-vector
 */

import 'dotenv/config';
import { getPayload } from 'payload';

import config from '../src/payload.config';
import { up } from '../src/migrations/20260510_170000_posts_search_vector';

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  // Le type MigrateUpArgs attend { db, payload, req }. Le `req` n'est
  // utilisé que pour passer aux `payload.find` du backfill — un objet
  // minimal suffit.
  await up({
    db: payload.db.drizzle as never,
    payload,
    req: { payload } as never,
  });
  // eslint-disable-next-line no-console
  console.log('✓ search_vector column + index + backfill appliqués.');
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('✗ Échec apply-search-vector:', err);
  process.exit(1);
});
