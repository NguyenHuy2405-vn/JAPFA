import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "fms_daily_logs"
      ALTER COLUMN "bird_count" DROP NOT NULL;
  `);
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "fms_daily_logs"
      ALTER COLUMN "bird_count" SET NOT NULL;
  `);
}
