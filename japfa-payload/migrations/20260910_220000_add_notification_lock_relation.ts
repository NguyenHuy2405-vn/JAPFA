import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "notifications_id" integer;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'payload_locked_documents_rels_notifications_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_notifications_fk"
          FOREIGN KEY ("notifications_id") REFERENCES "notifications"("id")
          ON DELETE CASCADE;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_notifications_id_idx"
      ON "payload_locked_documents_rels" USING btree ("notifications_id");
  `);
}

export async function down({}: MigrateDownArgs): Promise<void> {
  // Additive-only migration: rollback is intentionally a no-op.
}
