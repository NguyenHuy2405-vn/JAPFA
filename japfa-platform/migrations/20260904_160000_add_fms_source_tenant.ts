import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "fms_daily_logs"
      ADD COLUMN IF NOT EXISTS "source_tenant_id" varchar;
  `);
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "fms_daily_logs"
      DROP COLUMN IF EXISTS "source_tenant_id";
  `);
}
