import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "audit_logs_id" integer;
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_audit_logs_fk') THEN
        ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_logs_fk"
          FOREIGN KEY ("audit_logs_id") REFERENCES "audit_logs"("id") ON DELETE CASCADE;
      END IF;
    END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_audit_logs_id_idx"
      ON "payload_locked_documents_rels" USING btree ("audit_logs_id");
  `);
}

export async function down({}: MigrateDownArgs): Promise<void> {
  // Additive-only migration: rollback is intentionally a no-op.
}
