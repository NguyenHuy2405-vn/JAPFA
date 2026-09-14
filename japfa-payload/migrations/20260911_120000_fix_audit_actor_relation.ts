import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "audit_logs"
      ADD COLUMN IF NOT EXISTS "actor_user_id_id" integer;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_actor_user_id_id_users_id_fk') THEN
        ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_id_users_id_fk"
          FOREIGN KEY ("actor_user_id_id") REFERENCES "users"("id") ON DELETE SET NULL;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "audit_logs_actor_user_id_id_idx"
      ON "audit_logs" USING btree ("actor_user_id_id");
  `);
}

export async function down({}: MigrateDownArgs): Promise<void> {
  // Additive-only migration: rollback is intentionally a no-op.
}
