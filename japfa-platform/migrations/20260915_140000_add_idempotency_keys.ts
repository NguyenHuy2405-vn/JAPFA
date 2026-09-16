import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "idempotency_keys" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar NOT NULL,
      "collection" varchar NOT NULL,
      "action" varchar NOT NULL,
      "result_id" varchar,
      "expires_at" timestamp(3) with time zone NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "idempotency_keys_key_unique" UNIQUE("key")
    );

    CREATE INDEX IF NOT EXISTS "idempotency_keys_key_idx"
      ON "idempotency_keys" USING btree ("key");
    CREATE INDEX IF NOT EXISTS "idempotency_keys_expires_at_idx"
      ON "idempotency_keys" USING btree ("expires_at");
  `);
}

export async function down({}: MigrateDownArgs): Promise<void> {
  // Additive-only migration: rollback is intentionally a no-op.
}
