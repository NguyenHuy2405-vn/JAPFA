import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_transfer_requests_status'
      ) THEN
        CREATE TYPE "public"."enum_transfer_requests_status" AS ENUM(
          'DRAFT',
          'SUBMITTED',
          'APPROVED',
          'REJECTED',
          'IN_TRANSIT',
          'RECEIVED',
          'COMPLETED',
          'CANCELLED'
        );
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS "transfer_requests" (
      "id" serial PRIMARY KEY NOT NULL,
      "transfer_id" varchar,
      "from_tenant_id" integer,
      "to_tenant_id" integer,
      "product_id" integer,
      "quantity" numeric,
      "uom" varchar DEFAULT 'Bao',
      "status" "enum_transfer_requests_status" DEFAULT 'DRAFT' NOT NULL,
      "requested_by_id" integer,
      "approved_by_id" integer,
      "received_by_id" integer,
      "flock_id" integer,
      "note" varchar,
      "migration_key" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "transfer_requests"
      ADD COLUMN IF NOT EXISTS "transfer_id" varchar,
      ADD COLUMN IF NOT EXISTS "product_id" integer,
      ADD COLUMN IF NOT EXISTS "quantity" numeric,
      ADD COLUMN IF NOT EXISTS "uom" varchar DEFAULT 'Bao',
      ADD COLUMN IF NOT EXISTS "requested_by_id" integer,
      ADD COLUMN IF NOT EXISTS "approved_by_id" integer,
      ADD COLUMN IF NOT EXISTS "received_by_id" integer,
      ADD COLUMN IF NOT EXISTS "flock_id" integer,
      ADD COLUMN IF NOT EXISTS "migration_key" varchar;

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'transfer_requests'
          AND column_name = 'transfer_code'
      ) THEN
        EXECUTE 'UPDATE "transfer_requests" SET "transfer_id" = "transfer_code" WHERE "transfer_id" IS NULL AND "transfer_code" IS NOT NULL';
      END IF;
    END $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'transfer_requests_transfer_id_unique'
      ) THEN
        ALTER TABLE "transfer_requests"
          ADD CONSTRAINT "transfer_requests_transfer_id_unique" UNIQUE("transfer_id");
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'transfer_requests_product_id_products_id_fk'
      ) THEN
        ALTER TABLE "transfer_requests"
          ADD CONSTRAINT "transfer_requests_product_id_products_id_fk"
          FOREIGN KEY ("product_id") REFERENCES "products"("id")
          ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'transfer_requests_from_tenant_id_tenants_id_fk'
      ) THEN
        ALTER TABLE "transfer_requests"
          ADD CONSTRAINT "transfer_requests_from_tenant_id_tenants_id_fk"
          FOREIGN KEY ("from_tenant_id") REFERENCES "tenants"("id")
          ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'transfer_requests_to_tenant_id_tenants_id_fk'
      ) THEN
        ALTER TABLE "transfer_requests"
          ADD CONSTRAINT "transfer_requests_to_tenant_id_tenants_id_fk"
          FOREIGN KEY ("to_tenant_id") REFERENCES "tenants"("id")
          ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'transfer_requests_requested_by_id_users_id_fk'
      ) THEN
        ALTER TABLE "transfer_requests"
          ADD CONSTRAINT "transfer_requests_requested_by_id_users_id_fk"
          FOREIGN KEY ("requested_by_id") REFERENCES "users"("id")
          ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'transfer_requests_approved_by_id_users_id_fk'
      ) THEN
        ALTER TABLE "transfer_requests"
          ADD CONSTRAINT "transfer_requests_approved_by_id_users_id_fk"
          FOREIGN KEY ("approved_by_id") REFERENCES "users"("id")
          ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'transfer_requests_received_by_id_users_id_fk'
      ) THEN
        ALTER TABLE "transfer_requests"
          ADD CONSTRAINT "transfer_requests_received_by_id_users_id_fk"
          FOREIGN KEY ("received_by_id") REFERENCES "users"("id")
          ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'transfer_requests_flock_id_flocks_id_fk'
      ) THEN
        ALTER TABLE "transfer_requests"
          ADD CONSTRAINT "transfer_requests_flock_id_flocks_id_fk"
          FOREIGN KEY ("flock_id") REFERENCES "flocks"("id")
          ON DELETE SET NULL;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "transfer_requests_product_idx"
      ON "transfer_requests" USING btree ("product_id");
    CREATE INDEX IF NOT EXISTS "transfer_requests_from_tenant_idx"
      ON "transfer_requests" USING btree ("from_tenant_id");
    CREATE INDEX IF NOT EXISTS "transfer_requests_to_tenant_idx"
      ON "transfer_requests" USING btree ("to_tenant_id");
    CREATE INDEX IF NOT EXISTS "transfer_requests_requested_by_idx"
      ON "transfer_requests" USING btree ("requested_by_id");
    CREATE INDEX IF NOT EXISTS "transfer_requests_approved_by_idx"
      ON "transfer_requests" USING btree ("approved_by_id");
    CREATE INDEX IF NOT EXISTS "transfer_requests_received_by_idx"
      ON "transfer_requests" USING btree ("received_by_id");
    CREATE INDEX IF NOT EXISTS "transfer_requests_flock_idx"
      ON "transfer_requests" USING btree ("flock_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`SELECT 1;`);
}
