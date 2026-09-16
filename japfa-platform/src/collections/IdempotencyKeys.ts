import type { CollectionConfig } from "payload";
import { adminOnly, denyAll } from "@/access/admin-only";

export const IdempotencyKeys: CollectionConfig = {
  slug: "idempotency-keys",
  access: {
    create: () => true,
    read: adminOnly,
    update: denyAll,
    delete: denyAll,
  },
  admin: {
    hidden: true,
    useAsTitle: "key",
  },
  fields: [
    { name: "key", type: "text", required: true, unique: true, index: true },
    { name: "collection", type: "text", required: true },
    { name: "action", type: "text", required: true },
    { name: "resultId", type: "text" },
    { name: "expiresAt", type: "date", required: true, index: true },
  ],
  timestamps: true,
};
