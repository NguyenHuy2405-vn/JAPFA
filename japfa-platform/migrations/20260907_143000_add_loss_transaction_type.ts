import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(
    sql`ALTER TYPE "public"."enum_wms_transactions_txn_type" ADD VALUE IF NOT EXISTS 'LOSS'`,
  );
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  // PostgreSQL enum values cannot be removed safely in place.
  void payload;
}
