import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "flocks"
      ADD COLUMN IF NOT EXISTS "source_flock_group" varchar;
  `);
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "flocks"
      DROP COLUMN IF EXISTS "source_flock_group";
  `);
}
