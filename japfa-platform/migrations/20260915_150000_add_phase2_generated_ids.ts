import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "feed_standards"
      ADD COLUMN IF NOT EXISTS "standard_id" varchar;
    UPDATE "feed_standards"
      SET "standard_id" = 'FST-' || "id"
      WHERE "standard_id" IS NULL;
    ALTER TABLE "feed_standards"
      ALTER COLUMN "standard_id" SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS "feed_standards_standard_id_unique"
      ON "feed_standards" ("standard_id");

    ALTER TABLE "policy_thresholds"
      ADD COLUMN IF NOT EXISTS "threshold_id" varchar;
    UPDATE "policy_thresholds"
      SET "threshold_id" = 'POL-' || "id"
      WHERE "threshold_id" IS NULL;
    ALTER TABLE "policy_thresholds"
      ALTER COLUMN "threshold_id" SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS "policy_thresholds_threshold_id_unique"
      ON "policy_thresholds" ("threshold_id");

    ALTER TABLE "fms_daily_logs"
      ADD COLUMN IF NOT EXISTS "log_id" varchar;
    UPDATE "fms_daily_logs"
      SET "log_id" = 'FMS-' || "id"
      WHERE "log_id" IS NULL;
    ALTER TABLE "fms_daily_logs"
      ALTER COLUMN "log_id" SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS "fms_daily_logs_log_id_unique"
      ON "fms_daily_logs" ("log_id");
  `);
}

export async function down({}: MigrateDownArgs): Promise<void> {
  // Additive-only migration: rollback is intentionally a no-op.
}
