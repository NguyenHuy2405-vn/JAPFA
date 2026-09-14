import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_audit_logs_action') THEN
        CREATE TYPE "public"."enum_audit_logs_action" AS ENUM(
          'FARM_CREATED','FARM_LOCKED','FARM_UNLOCKED','USER_CREATED',
          'USER_ROLE_CHANGED','USER_LOCKED','USER_UNLOCKED','ORDER_APPROVED',
          'ORDER_REJECTED','TRANSFER_APPROVED','TRANSFER_REJECTED','TRANSFER_RECEIVED'
        );
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" serial PRIMARY KEY NOT NULL,
      "actor_user_id" integer NOT NULL,
      "actor_email" varchar NOT NULL,
      "actor_role" varchar NOT NULL,
      "action" "enum_audit_logs_action" NOT NULL,
      "target_collection" varchar NOT NULL,
      "target_id" varchar NOT NULL,
      "before" jsonb,
      "after" jsonb,
      "ip" varchar,
      "user_agent" varchar,
      "timestamp" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_actor_user_id_users_id_fk') THEN
        ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk"
          FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "audit_logs_actor_user_id_idx" ON "audit_logs" USING btree ("actor_user_id");
    CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action");
    CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");
    CREATE INDEX IF NOT EXISTS "audit_logs_target_collection_idx" ON "audit_logs" USING btree ("target_collection");
    CREATE INDEX IF NOT EXISTS "audit_logs_target_id_idx" ON "audit_logs" USING btree ("target_id");
  `);
}

export async function down({}: MigrateDownArgs): Promise<void> {
  // Additive-only migration: rollback is intentionally a no-op.
}
