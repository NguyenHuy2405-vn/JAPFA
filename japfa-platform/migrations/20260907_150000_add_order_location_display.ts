import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "origin_display" varchar,
      ADD COLUMN IF NOT EXISTS "destination_display" varchar;
  `);
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "origin_display",
      DROP COLUMN IF EXISTS "destination_display";
  `);
}
