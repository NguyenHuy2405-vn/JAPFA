import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";

import { Users } from "./src/collections/Users";
import { Tenants } from "./src/collections/Tenants";
import { Flocks } from "./src/collections/Flocks";
import { Products } from "./src/collections/Products";
import { FeedStandards } from "./src/collections/FeedStandards";
import { PolicyThresholds } from "./src/collections/PolicyThresholds";
import { Orders } from "./src/collections/Orders";
import { WmsTransactions } from "./src/collections/WmsTransactions";
import { FmsDailyLogs } from "./src/collections/FmsDailyLogs";
import { TransferRequests } from "./src/collections/TransferRequests";
import { Notifications } from "./src/collections/Notifications";
import { AuditLogs } from "./src/collections/AuditLogs";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const databaseURI = process.env.DATABASE_URI;

if (!databaseURI) {
  throw new Error("DATABASE_URI must be configured.");
}

export default buildConfig({
  admin: {
    disable: true,
    user: Users.slug,
  },
  collections: [
    Users,
    Tenants,
    Flocks,
    Products,
    FeedStandards,
    PolicyThresholds,
    Orders,
    WmsTransactions,
    FmsDailyLogs,
    TransferRequests,
    Notifications,
    AuditLogs,
  ],
  editor: lexicalEditor(),
  secret:
    process.env.PAYLOAD_SECRET ||
    (() => {
      throw new Error("PAYLOAD_SECRET must be configured.");
    })(),
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    migrationDir: path.resolve(dirname, "migrations"),
    pool: {
      connectionString: databaseURI,
      max: Number(process.env.DATABASE_POOL_MAX || 20),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    },
    push: false,
  }),
});
