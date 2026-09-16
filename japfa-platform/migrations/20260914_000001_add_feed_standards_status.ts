import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_feed_standards_status'
      ) THEN
        CREATE TYPE "public"."enum_feed_standards_status" AS ENUM(
          'ACTIVE',
          'INACTIVE'
        );
      END IF;
    END $$;

    ALTER TABLE "feed_standards"
      ADD COLUMN IF NOT EXISTS "status" "public"."enum_feed_standards_status" DEFAULT 'ACTIVE' NOT NULL;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "feed_standards"
      DROP COLUMN IF EXISTS "status";

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_feed_standards_status'
      ) THEN
        DROP TYPE "public"."enum_feed_standards_status";
      END IF;
    END $$;
  `);
}
