import type { CollectionConfig } from "payload";
import { adminOnly, systemOnly } from "@/access/admin-only";
import { denyAll } from "@/access/deny-all";

export const AuditLogs: CollectionConfig = {
  slug: "audit-logs",
  access: {
    read: adminOnly,
    create: systemOnly,
    update: denyAll,
    delete: denyAll,
  },
  admin: {
    hideAPIURL: true,
    useAsTitle: "action",
    defaultColumns: [
      "timestamp",
      "actorEmail",
      "action",
      "targetCollection",
      "targetId",
    ],
  },
  fields: [
    {
      name: "actorUserId",
      type: "relationship",
      relationTo: "users",
      required: true,
      index: true,
    },
    { name: "actorEmail", type: "text", required: true },
    { name: "actorRole", type: "text", required: true },
    { name: "action", type: "text", required: true, index: true },
    { name: "targetCollection", type: "text", required: true, index: true },
    { name: "targetId", type: "text", required: true, index: true },
    { name: "before", type: "json" },
    { name: "after", type: "json" },
    { name: "ip", type: "text" },
    { name: "userAgent", type: "text" },
    {
      name: "timestamp",
      type: "date",
      required: true,
      defaultValue: () => new Date(),
      index: true,
    },
  ],
};
