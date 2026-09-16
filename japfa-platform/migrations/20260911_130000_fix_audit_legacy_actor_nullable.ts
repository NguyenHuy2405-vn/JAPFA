import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "audit_logs"
      ALTER COLUMN "actor_user_id" DROP NOT NULL;
  `);
}

export async function down({}: MigrateDownArgs): Promise<void> {
  // Additive-compatible correction: rollback is intentionally a no-op.
}
