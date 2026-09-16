import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { vi } from "@payloadcms/translations/languages/vi";
import { en } from "@payloadcms/translations/languages/en";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";

import { sentryPlugin } from "@payloadcms/plugin-sentry";
import { importExportPlugin } from "@payloadcms/plugin-import-export";
import { searchPlugin } from "@payloadcms/plugin-search";

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
import { IdempotencyKeys } from "./src/collections/IdempotencyKeys";

import { importService } from "./src/services/import.service";
import { searchService } from "./src/services/search.service";
import { notificationService } from "./src/services/notification.service";
import { inventoryService } from "./src/services/inventory.service";
import { emailService } from "./src/services/email.service";
import { fmsService } from "./src/services/fms.service";
import { auditService } from "./src/services/audit.service";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const databaseURI = process.env.DATABASE_URI;

if (!databaseURI) {
  throw new Error("DATABASE_URI must be configured.");
}

export default buildConfig({
  routes: {
    admin: "/payload-admin",
  },
  i18n: {
    supportedLanguages: { vi, en },
  },
  jobs: {
    tasks: [
      {
        slug: "importLargeFile",
        inputSchema: [
          { name: "fileUrl", type: "text", required: true },
          { name: "collection", type: "text", required: true },
        ],
        retries: 3,
        handler: async ({ input }: any) => {
          const count = await importService.process(
            input.fileUrl as string,
            input.collection as string,
          );
          return { output: { processed: count } };
        },
      },
      {
        slug: "reindexSearch",
        inputSchema: [{ name: "collection", type: "text" }],
        retries: 5,
        handler: async ({ input }: any) => {
          await searchService.reindex(input.collection as string);
          return { output: { reindexed: true } };
        },
      },
      {
        slug: "sendOrderNotification",
        inputSchema: [
          { name: "orderId", type: "text", required: true },
          { name: "newStatus", type: "text", required: true },
        ],
        retries: 3,
        handler: async ({ input }: any) => {
          await notificationService.send({
            title: `Order ${input.orderId} -> ${input.newStatus}`,
            targetCollection: "orders",
            targetId: input.orderId as string,
          });
          return { output: { sent: true } };
        },
      },
      {
        slug: "recalculateInventory",
        inputSchema: [{ name: "tenantId", type: "text", required: true }],
        retries: 2,
        handler: async ({ input }: any) => {
          await inventoryService.recalculate(input.tenantId as string);
          return { output: { done: true } };
        },
      },
      {
        slug: "sendWelcomeEmail",
        inputSchema: [
          { name: "userId", type: "text", required: true },
          { name: "email", type: "email", required: true },
        ],
        retries: 3,
        handler: async ({ input }: any) => {
          await emailService.sendWelcome(input.email as string);
          return { output: { sent: true } };
        },
      },
      {
        slug: "fmsAggregation",
        inputSchema: [{ name: "date", type: "date", required: true }],
        retries: 2,
        handler: async ({ input }: any) => {
          await fmsService.aggregate(input.date as string);
          return { output: { done: true } };
        },
      },
      {
        slug: "auditArchive",
        inputSchema: [{ name: "beforeDate", type: "date", required: true }],
        retries: 1,
        handler: async ({ input }: any) => {
          await auditService.archive(input.beforeDate as string);
          return { output: { archived: true } };
        },
      },
    ],
    autoRun: [
      { cron: "* * * * *", queue: "default" },
      { cron: "*/5 * * * *", queue: "imports" },
      { cron: "*/2 * * * *", queue: "notifications" },
    ],
  },
  admin: {
    disable: false,
    user: Users.slug,
    autoRefresh: true,
    dateFormat: "dd/MM/yyyy HH:mm",
    theme: "dark",
    toast: {
      duration: 5000,
      limit: 3,
      position: "top-right",
    },
    timezones: {
      supportedTimezones: [
        { label: "Việt Nam (GMT+7)", value: "Asia/Ho_Chi_Minh" },
        { label: "UTC", value: "UTC" },
      ],
      defaultTimezone: "Asia/Ho_Chi_Minh",
    },
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
    IdempotencyKeys,
  ],
  plugins: [
    sentryPlugin({
      enabled: process.env.NODE_ENV === "production",
      options: {
        context: ({ req }: any) => ({
          user: req?.user ? { id: String(req.user.id) } : undefined,
          extra: {
            environment: process.env.NODE_ENV,
          },
        }),
      },
    }),
    importExportPlugin({
      collections: [
        { slug: "tenants" },
        { slug: "flocks" },
        { slug: "products" },
        { slug: "feed-standards" },
        { slug: "policy-thresholds" },
        { slug: "orders" },
        { slug: "wms-transactions" },
        { slug: "fms-daily-logs" },
      ],
      exportLimit: 10000,
      importLimit: 10000,
    }),
    searchPlugin({
      collections: [
        "tenants",
        "flocks",
        "products",
        "orders",
        "transfer-requests",
      ],
      beforeSync: ({ originalDoc, searchDoc }) => ({
        ...searchDoc,
        title:
          originalDoc.name ||
          originalDoc.farmCode ||
          originalDoc.flockId ||
          originalDoc.sku ||
          originalDoc.orderId ||
          originalDoc.transferId ||
          "Untitled",
        excerpt: originalDoc.farmCode || originalDoc.client || "",
      }),
      defaultPriorities: {
        tenants: 10,
        flocks: 8,
        products: 8,
        orders: 5,
        "transfer-requests": 5,
      },
    }),
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
      max: Number(process.env.DATABASE_POOL_MAX || 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    },
    push: false,
  }),
});
