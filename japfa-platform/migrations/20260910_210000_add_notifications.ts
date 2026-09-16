import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_notifications_type'
      ) THEN
        CREATE TYPE "public"."enum_notifications_type" AS ENUM(
          'ORDER_APPROVED',
          'ORDER_REJECTED',
          'ORDER_INCOMING',
          'ORDER_RECEIVED',
          'ORDER_COMPLETED',
          'ORDER_ISSUE',
          'TRANSFER_APPROVED',
          'TRANSFER_REJECTED',
          'TRANSFER_INCOMING',
          'TRANSFER_RECEIVED',
          'TRANSFER_COMPLETED',
          'TRANSFER_ISSUE'
        );
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS "notifications" (
      "id" serial PRIMARY KEY NOT NULL,
      "recipient_id" integer NOT NULL,
      "type" "enum_notifications_type" NOT NULL,
      "title" varchar NOT NULL,
      "message" varchar NOT NULL,
      "related_order_id" integer,
      "related_transfer_id" integer,
      "is_read" boolean DEFAULT false,
      "read_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notifications_recipient_id_users_id_fk'
      ) THEN
        ALTER TABLE "notifications"
          ADD CONSTRAINT "notifications_recipient_id_users_id_fk"
          FOREIGN KEY ("recipient_id") REFERENCES "users"("id")
          ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notifications_related_order_id_orders_id_fk'
      ) THEN
        ALTER TABLE "notifications"
          ADD CONSTRAINT "notifications_related_order_id_orders_id_fk"
          FOREIGN KEY ("related_order_id") REFERENCES "orders"("id")
          ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'notifications_related_transfer_id_transfer_requests_id_fk'
      )
      AND to_regclass('public.transfer_requests') IS NOT NULL THEN
        ALTER TABLE "notifications"
          ADD CONSTRAINT "notifications_related_transfer_id_transfer_requests_id_fk"
          FOREIGN KEY ("related_transfer_id") REFERENCES "transfer_requests"("id")
          ON DELETE SET NULL;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "notifications_recipient_idx"
      ON "notifications" USING btree ("recipient_id");
    CREATE INDEX IF NOT EXISTS "notifications_is_read_idx"
      ON "notifications" USING btree ("is_read");
    CREATE INDEX IF NOT EXISTS "notifications_related_order_idx"
      ON "notifications" USING btree ("related_order_id");
    CREATE INDEX IF NOT EXISTS "notifications_related_transfer_idx"
      ON "notifications" USING btree ("related_transfer_id");
  `);
}

export async function down({}: MigrateDownArgs): Promise<void> {
  // Additive-only migration: rollback is intentionally a no-op.
}
