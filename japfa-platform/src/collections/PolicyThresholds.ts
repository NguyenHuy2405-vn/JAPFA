import type { CollectionConfig } from "payload";
import { adminOnly } from "@/access/admin-only";

export const PolicyThresholds: CollectionConfig = {
  slug: "policy-thresholds",
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    useAsTitle: "sku",
    defaultColumns: [
      "sku",
      "minStockDays",
      "lowStockThreshold",
      "criticalStockThreshold",
    ],
  },
  fields: [
    {
      name: "sku",
      type: "text",
      required: true,
      unique: true,
      label: "Mã hàng / SKU",
    },
    {
      name: "minStockDays",
      type: "number",
      required: true,
      defaultValue: 3,
      min: 0,
      label: "Số ngày tồn kho an toàn tối thiểu",
    },
    {
      name: "lowStockThreshold",
      type: "number",
      required: true,
      defaultValue: 20,
      min: 0,
      label: "Ngưỡng cảnh báo Low Stock (%)",
    },
    {
      name: "criticalStockThreshold",
      type: "number",
      required: true,
      defaultValue: 10,
      min: 0,
      label: "Ngưỡng cảnh báo Critical Stock (%)",
    },
    { name: "zeroThreshold", type: "number", min: 0 },
    { name: "highThreshold", type: "number", min: 0 },
    { name: "status", type: "text" },
    { name: "note", type: "textarea" },
    {
      name: "thresholdId",
      type: "text",
      required: true,
      unique: true,
      admin: { readOnly: true, hidden: true },
      access: { update: () => false },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        if (operation === "create" && data && !data.thresholdId) {
          data.thresholdId = `POL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        }
        return data;
      },
    ],
  },
};
