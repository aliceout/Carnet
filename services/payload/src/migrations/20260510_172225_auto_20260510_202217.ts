import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" ADD COLUMN "search_vector" "tsvector";
  CREATE INDEX "posts_search_vector_idx" ON "posts" USING gin ("search_vector");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "posts_search_vector_idx";
  ALTER TABLE "posts" DROP COLUMN "search_vector";`)
}
