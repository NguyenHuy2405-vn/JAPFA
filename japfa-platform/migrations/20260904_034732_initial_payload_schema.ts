import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('ADMIN', 'PROCUREMENT', 'INVENTORY', 'OPS', 'TECHNICAL', 'VIEWER');
  CREATE TYPE "public"."enum_tenants_system" AS ENUM('WMS', 'FMS', 'OMS', 'TMS');
  CREATE TYPE "public"."enum_tenants_type" AS ENUM('FACTORY', 'FARM');
  CREATE TYPE "public"."enum_products_status" AS ENUM('ACTIVE', 'INACTIVE');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('PLANNED', 'PICKED_UP', 'IN_TRANSIT', 'COMPLETED');
  CREATE TYPE "public"."enum_wms_transactions_scope" AS ENUM('FACTORY', 'FARM');
  CREATE TYPE "public"."enum_wms_transactions_txn_type" AS ENUM('INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'CONSUME');
  CREATE TYPE "public"."enum_fms_daily_logs_badge_status" AS ENUM('NORMAL', 'LOW', 'CRITICAL', 'ZERO');
  CREATE TABLE IF NOT EXISTS "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"role" "enum_users_role" DEFAULT 'ADMIN' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE IF NOT EXISTS "users_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tenants_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "tenants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"system" "enum_tenants_system" DEFAULT 'WMS',
  	"type" "enum_tenants_type" DEFAULT 'FARM' NOT NULL,
  	"flock_id" varchar,
  	"updated_by" varchar,
  	"managed_by" varchar,
  	"address_of_tenant" varchar,
  	"flock_name" varchar,
  	"standards_applied" varchar,
  	"start_flock_count" numeric,
  	"start_flock_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "flocks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"flock_id" varchar NOT NULL,
  	"tenant_id" integer NOT NULL,
  	"chicken_type" varchar NOT NULL,
  	"initial_bird_count" numeric NOT NULL,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"flock_name" varchar,
  	"standards_applied" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"sku" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"product_type" varchar DEFAULT 'Chicken_feed' NOT NULL,
  	"uom" varchar DEFAULT 'Bao' NOT NULL,
  	"uom_weight_kg" numeric DEFAULT 40 NOT NULL,
  	"stock_age_min" numeric,
  	"stock_age_max" numeric,
  	"status" "enum_products_status" DEFAULT 'ACTIVE',
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "feed_standards" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"chicken_type" varchar NOT NULL,
  	"age_in_days" numeric NOT NULL,
  	"feed_qty_per_bird_per_day" numeric NOT NULL,
  	"cum_feed_qty" numeric,
  	"fcr" numeric,
  	"cum_dep_percent" numeric,
  	"bw_gr" numeric,
  	"feed_name" varchar,
  	"migration_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "policy_thresholds" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"sku" varchar NOT NULL,
  	"min_stock_days" numeric DEFAULT 3 NOT NULL,
  	"low_stock_threshold" numeric DEFAULT 20 NOT NULL,
  	"critical_stock_threshold" numeric DEFAULT 10 NOT NULL,
  	"zero_threshold" numeric,
  	"high_threshold" numeric,
  	"status" varchar,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_id" varchar NOT NULL,
  	"tenant_id" integer NOT NULL,
  	"client" varchar NOT NULL,
  	"origin_id" integer NOT NULL,
  	"destination_id" integer NOT NULL,
  	"product_id" integer NOT NULL,
  	"quantity" numeric NOT NULL,
  	"uom" varchar DEFAULT 'Bao',
  	"status" "enum_orders_status" DEFAULT 'PLANNED' NOT NULL,
  	"pickup_date" timestamp(3) with time zone,
  	"expected_delivery_date" timestamp(3) with time zone,
  	"actual_delivery_date" timestamp(3) with time zone,
  	"flock_id" integer,
  	"note" varchar,
  	"migration_key" varchar,
  	"create_date" timestamp(3) with time zone,
  	"location" varchar,
  	"tms_order_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "wms_transactions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"scope" "enum_wms_transactions_scope" DEFAULT 'FACTORY' NOT NULL,
  	"tenant_id" integer NOT NULL,
  	"flock_id" integer,
  	"product_id" integer NOT NULL,
  	"txn_type" "enum_wms_transactions_txn_type" NOT NULL,
  	"quantity" numeric NOT NULL,
  	"order_id" integer,
  	"reason" varchar,
  	"date" timestamp(3) with time zone NOT NULL,
  	"note" varchar,
  	"migration_key" varchar,
  	"transaction_id" varchar,
  	"date_input" timestamp(3) with time zone,
  	"age_in_days" numeric,
  	"begin_quantity" numeric,
  	"in_quantity" numeric,
  	"out_quantity" numeric,
  	"end_quantity" numeric,
  	"end_order_quantity" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "fms_daily_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer NOT NULL,
  	"flock_id" integer NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"age_in_days" numeric NOT NULL,
  	"bird_count" numeric NOT NULL,
  	"feed_product_id" integer,
  	"feed_qty_est" numeric,
  	"feed_qty_act" numeric,
  	"feed_qty_in" numeric DEFAULT 0,
  	"end_qty" numeric NOT NULL,
  	"badge_status" "enum_fms_daily_logs_badge_status" DEFAULT 'NORMAL',
  	"migration_key" varchar,
  	"feed_state" varchar,
  	"mort_act" numeric,
  	"mort_est" numeric,
  	"population_est" numeric,
  	"feed_name_order" varchar,
  	"feed_begin_qty" numeric,
  	"stock_level_percentage" numeric,
  	"current_day" numeric,
  	"day_case_study" varchar,
  	"source_column20" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"tenants_id" integer,
  	"flocks_id" integer,
  	"products_id" integer,
  	"feed_standards_id" integer,
  	"policy_thresholds_id" integer,
  	"orders_id" integer,
  	"wms_transactions_id" integer,
  	"fms_daily_logs_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  DO $$ BEGIN
   ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_tenants_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "flocks" ADD CONSTRAINT "flocks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "orders" ADD CONSTRAINT "orders_origin_id_tenants_id_fk" FOREIGN KEY ("origin_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "orders" ADD CONSTRAINT "orders_destination_id_tenants_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "orders" ADD CONSTRAINT "orders_flock_id_flocks_id_fk" FOREIGN KEY ("flock_id") REFERENCES "public"."flocks"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "wms_transactions" ADD CONSTRAINT "wms_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "wms_transactions" ADD CONSTRAINT "wms_transactions_flock_id_flocks_id_fk" FOREIGN KEY ("flock_id") REFERENCES "public"."flocks"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "wms_transactions" ADD CONSTRAINT "wms_transactions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "wms_transactions" ADD CONSTRAINT "wms_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "fms_daily_logs" ADD CONSTRAINT "fms_daily_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "fms_daily_logs" ADD CONSTRAINT "fms_daily_logs_flock_id_flocks_id_fk" FOREIGN KEY ("flock_id") REFERENCES "public"."flocks"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "fms_daily_logs" ADD CONSTRAINT "fms_daily_logs_feed_product_id_products_id_fk" FOREIGN KEY ("feed_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tenants_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_flocks_fk" FOREIGN KEY ("flocks_id") REFERENCES "public"."flocks"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_feed_standards_fk" FOREIGN KEY ("feed_standards_id") REFERENCES "public"."feed_standards"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_policy_thresholds_fk" FOREIGN KEY ("policy_thresholds_id") REFERENCES "public"."policy_thresholds"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wms_transactions_fk" FOREIGN KEY ("wms_transactions_id") REFERENCES "public"."wms_transactions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_fms_daily_logs_fk" FOREIGN KEY ("fms_daily_logs_id") REFERENCES "public"."fms_daily_logs"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX IF NOT EXISTS "users_rels_order_idx" ON "users_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "users_rels_parent_idx" ON "users_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "users_rels_path_idx" ON "users_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "users_rels_tenants_id_idx" ON "users_rels" USING btree ("tenants_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "tenants_tenant_id_idx" ON "tenants" USING btree ("tenant_id");
  CREATE INDEX IF NOT EXISTS "tenants_updated_at_idx" ON "tenants" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "tenants_created_at_idx" ON "tenants" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "flocks_flock_id_idx" ON "flocks" USING btree ("flock_id");
  CREATE INDEX IF NOT EXISTS "flocks_tenant_idx" ON "flocks" USING btree ("tenant_id");
  CREATE INDEX IF NOT EXISTS "flocks_updated_at_idx" ON "flocks" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "flocks_created_at_idx" ON "flocks" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_idx" ON "products" USING btree ("sku");
  CREATE INDEX IF NOT EXISTS "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "feed_standards_migration_key_idx" ON "feed_standards" USING btree ("migration_key");
  CREATE INDEX IF NOT EXISTS "feed_standards_updated_at_idx" ON "feed_standards" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "feed_standards_created_at_idx" ON "feed_standards" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "policy_thresholds_sku_idx" ON "policy_thresholds" USING btree ("sku");
  CREATE INDEX IF NOT EXISTS "policy_thresholds_updated_at_idx" ON "policy_thresholds" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "policy_thresholds_created_at_idx" ON "policy_thresholds" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "orders_order_id_idx" ON "orders" USING btree ("order_id");
  CREATE INDEX IF NOT EXISTS "orders_tenant_idx" ON "orders" USING btree ("tenant_id");
  CREATE INDEX IF NOT EXISTS "orders_origin_idx" ON "orders" USING btree ("origin_id");
  CREATE INDEX IF NOT EXISTS "orders_destination_idx" ON "orders" USING btree ("destination_id");
  CREATE INDEX IF NOT EXISTS "orders_product_idx" ON "orders" USING btree ("product_id");
  CREATE INDEX IF NOT EXISTS "orders_flock_idx" ON "orders" USING btree ("flock_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "orders_migration_key_idx" ON "orders" USING btree ("migration_key");
  CREATE INDEX IF NOT EXISTS "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "wms_transactions_tenant_idx" ON "wms_transactions" USING btree ("tenant_id");
  CREATE INDEX IF NOT EXISTS "wms_transactions_flock_idx" ON "wms_transactions" USING btree ("flock_id");
  CREATE INDEX IF NOT EXISTS "wms_transactions_product_idx" ON "wms_transactions" USING btree ("product_id");
  CREATE INDEX IF NOT EXISTS "wms_transactions_order_idx" ON "wms_transactions" USING btree ("order_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "wms_transactions_migration_key_idx" ON "wms_transactions" USING btree ("migration_key");
  CREATE INDEX IF NOT EXISTS "wms_transactions_updated_at_idx" ON "wms_transactions" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "wms_transactions_created_at_idx" ON "wms_transactions" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "fms_daily_logs_tenant_idx" ON "fms_daily_logs" USING btree ("tenant_id");
  CREATE INDEX IF NOT EXISTS "fms_daily_logs_flock_idx" ON "fms_daily_logs" USING btree ("flock_id");
  CREATE INDEX IF NOT EXISTS "fms_daily_logs_feed_product_idx" ON "fms_daily_logs" USING btree ("feed_product_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "fms_daily_logs_migration_key_idx" ON "fms_daily_logs" USING btree ("migration_key");
  CREATE INDEX IF NOT EXISTS "fms_daily_logs_updated_at_idx" ON "fms_daily_logs" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "fms_daily_logs_created_at_idx" ON "fms_daily_logs" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_tenants_id_idx" ON "payload_locked_documents_rels" USING btree ("tenants_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_flocks_id_idx" ON "payload_locked_documents_rels" USING btree ("flocks_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_feed_standards_id_idx" ON "payload_locked_documents_rels" USING btree ("feed_standards_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_policy_thresholds_id_idx" ON "payload_locked_documents_rels" USING btree ("policy_thresholds_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_wms_transactions_id_idx" ON "payload_locked_documents_rels" USING btree ("wms_transactions_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_fms_daily_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("fms_daily_logs_id");
  CREATE INDEX IF NOT EXISTS "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX IF NOT EXISTS "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX IF NOT EXISTS "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`);
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
   DROP TABLE "users" CASCADE;
  DROP TABLE "users_rels" CASCADE;
  DROP TABLE "tenants" CASCADE;
  DROP TABLE "flocks" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "feed_standards" CASCADE;
  DROP TABLE "policy_thresholds" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "wms_transactions" CASCADE;
  DROP TABLE "fms_daily_logs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_tenants_system";
  DROP TYPE "public"."enum_tenants_type";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_wms_transactions_scope";
  DROP TYPE "public"."enum_wms_transactions_txn_type";
  DROP TYPE "public"."enum_fms_daily_logs_badge_status";`);
}
