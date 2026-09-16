import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_users_account_status'
      ) THEN
        CREATE TYPE "public"."enum_users_account_status" AS ENUM(
          'ACTIVE',
          'LOCKED'
        );
      END IF;
    END $$;

    ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "full_name" varchar NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "phone" varchar,
      ADD COLUMN IF NOT EXISTS "account_status" "public"."enum_users_account_status" DEFAULT 'ACTIVE' NOT NULL,
      ADD COLUMN IF NOT EXISTS "authz_version" numeric DEFAULT 1 NOT NULL,
      ADD COLUMN IF NOT EXISTS "must_change_password" boolean DEFAULT true NOT NULL,
      ADD COLUMN IF NOT EXISTS "primary_tenant_id" integer;

    ALTER TABLE "users" ALTER COLUMN "full_name" DROP DEFAULT;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_primary_tenant_id_tenants_id_fk'
      ) THEN
        ALTER TABLE "users"
          ADD CONSTRAINT "users_primary_tenant_id_tenants_id_fk"
          FOREIGN KEY ("primary_tenant_id") REFERENCES "tenants"("id")
          ON DELETE SET NULL;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "users_primary_tenant_idx" ON "users" USING btree ("primary_tenant_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users"
      DROP COLUMN IF EXISTS "full_name",
      DROP COLUMN IF EXISTS "phone",
      DROP COLUMN IF EXISTS "account_status",
      DROP COLUMN IF EXISTS "authz_version",
      DROP COLUMN IF EXISTS "must_change_password",
      DROP COLUMN IF EXISTS "primary_tenant_id";

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_users_account_status'
      ) THEN
        DROP TYPE "public"."enum_users_account_status";
      END IF;
    END $$;
  `);
}
