import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "users"
      ALTER COLUMN "reset_password_token" TYPE text,
      ALTER COLUMN "salt" TYPE text,
      ALTER COLUMN "hash" TYPE text;
  `);
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "users"
      ALTER COLUMN "reset_password_token" TYPE varchar(255),
      ALTER COLUMN "salt" TYPE varchar(255),
      ALTER COLUMN "hash" TYPE varchar(255);
  `);
}
