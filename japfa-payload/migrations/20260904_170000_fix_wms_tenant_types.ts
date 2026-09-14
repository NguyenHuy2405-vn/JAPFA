import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    UPDATE "tenants"
    SET "type" = 'FARM'
    WHERE "tenant_id" ~ '^WMS_[1-9]$';

    UPDATE "tenants"
    SET "type" = 'FACTORY'
    WHERE "tenant_id" IN ('WMS_01', 'WMS_1_FACTORY');
  `);
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    UPDATE "tenants"
    SET "type" = 'FACTORY'
    WHERE "tenant_id" ~ '^WMS_[1-9]$';
  `);
}
