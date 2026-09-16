import { MigrateDownArgs, MigrateUpArgs } from "@payloadcms/db-postgres";

export async function up(_: MigrateUpArgs): Promise<void> {
  // This migration duplicated schema changes that already exist in earlier migrations.
  // Keep it as a no-op so pending environments can advance migration history safely.
}

export async function down(_: MigrateDownArgs): Promise<void> {
  // No-op rollback for the no-op migration.
}
