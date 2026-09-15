import type { MigrateDownArgs, MigrateUpArgs } from "@payloadcms/db-postgres";

export async function up({}: MigrateUpArgs): Promise<void> {
  // Role values are stored as text/select data in the existing users schema.
  // Existing ADMIN records remain unchanged; new users use the collection default FARM.
}

export async function down({}: MigrateDownArgs): Promise<void> {
  // Additive role option change; existing user data is intentionally preserved.
}
