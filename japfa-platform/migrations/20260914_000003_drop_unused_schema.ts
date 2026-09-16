import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- tenants: legacy columns superseded by name/type, verified 100% redundant or default-only
    ALTER TABLE "tenants"
      DROP COLUMN IF EXISTS "farm_name",
      DROP COLUMN IF EXISTS "farm_type";

    -- transfer_requests: legacy/unfinished columns, verified table empty (no data loss)
    ALTER TABLE "transfer_requests"
      DROP COLUMN IF EXISTS "transfer_code",
      DROP COLUMN IF EXISTS "hold_reason",
      DROP COLUMN IF EXISTS "linked_outbound_txn_id",
      DROP COLUMN IF EXISTS "linked_inbound_txn_id",
      DROP COLUMN IF EXISTS "idempotency_key_approve",
      DROP COLUMN IF EXISTS "idempotency_key_receive",
      DROP COLUMN IF EXISTS "approved_at",
      DROP COLUMN IF EXISTS "received_at";

    -- transfer_requests_items: unfinished multi-item feature, verified 0 rows, no code references
    DROP TABLE IF EXISTS "transfer_requests_items" CASCADE;

    -- audit_logs: actor_user_id is dead (always NULL); actor_user_id_id is the live column
    -- that Payload's relationship naming actually writes to. Drop the dead column only.
    ALTER TABLE "audit_logs"
      DROP COLUMN IF EXISTS "actor_user_id";

    -- users: users_email_idx duplicates users_email_key (both UNIQUE on email); keep the
    -- constraint-backed one and drop the redundant explicit index.
    DROP INDEX IF EXISTS "users_email_idx";
  `);
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // Destructive cleanup migration: intentionally no-op rollback.
  // Columns/table removed here were verified redundant or empty before drop.
}
