import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_audit_logs_action"
      ADD VALUE IF NOT EXISTS 'CREATE_FARM';
    ALTER TYPE "public"."enum_audit_logs_action"
      ADD VALUE IF NOT EXISTS 'APPROVE_ORDER';
    ALTER TYPE "public"."enum_audit_logs_action"
      ADD VALUE IF NOT EXISTS 'RECEIVE_ORDER';
    ALTER TYPE "public"."enum_audit_logs_action"
      ADD VALUE IF NOT EXISTS 'ORDER_RECEIVED';
  `);
}

export async function down({}: MigrateDownArgs): Promise<void> {
  // PostgreSQL enum values are additive; rollback is intentionally a no-op.
}
