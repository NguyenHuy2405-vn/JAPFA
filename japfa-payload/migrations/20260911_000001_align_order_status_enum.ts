import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_orders_status' AND e.enumlabel = 'DRAFT'
      ) THEN
        ALTER TYPE "public"."enum_orders_status" ADD VALUE 'DRAFT';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_orders_status' AND e.enumlabel = 'SUBMITTED'
      ) THEN
        ALTER TYPE "public"."enum_orders_status" ADD VALUE 'SUBMITTED';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_orders_status' AND e.enumlabel = 'APPROVED'
      ) THEN
        ALTER TYPE "public"."enum_orders_status" ADD VALUE 'APPROVED';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_orders_status' AND e.enumlabel = 'REJECTED'
      ) THEN
        ALTER TYPE "public"."enum_orders_status" ADD VALUE 'REJECTED';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_orders_status' AND e.enumlabel = 'RECEIVED'
      ) THEN
        ALTER TYPE "public"."enum_orders_status" ADD VALUE 'RECEIVED';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_orders_status' AND e.enumlabel = 'CANCELLED'
      ) THEN
        ALTER TYPE "public"."enum_orders_status" ADD VALUE 'CANCELLED';
      END IF;
    END $$;
  `);
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  // PostgreSQL does not support removing enum values safely in-place.
  // This compatibility migration is intentionally non-destructive.
  await payload.db.drizzle.execute(sql`SELECT 1;`);
}
