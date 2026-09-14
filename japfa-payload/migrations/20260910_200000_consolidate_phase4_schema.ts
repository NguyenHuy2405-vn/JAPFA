import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "tenants"
      ADD COLUMN IF NOT EXISTS "phone" varchar;

    ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "created_by_id" integer;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_created_by_id_users_id_fk'
      ) THEN
        ALTER TABLE "users"
          ADD CONSTRAINT "users_created_by_id_users_id_fk"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
          ON DELETE SET NULL;
      END IF;
    END $$;
  `);
}

export async function down({}: MigrateDownArgs): Promise<void> {
  // Additive-only migration: rollback is intentionally a no-op.
}
