import type { CollectionConfig } from "payload";
import { adminOnly } from "@/access/admin-only";

export const FmsDailyLogs: CollectionConfig = {
  slug: "fms-daily-logs",
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    useAsTitle: "id",
    defaultColumns: [
      "date",
      "tenant",
      "flock",
      "ageInDays",
      "birdCount",
      "feedQtyAct",
      "endQty",
      "badgeStatus",
    ],
  },
  fields: [
    {
      name: "tenant",
      type: "relationship",
      relationTo: "tenants",
      required: true,
      label: "Trại gà (Tenant)",
    },
    {
      name: "sourceTenantId",
      type: "text",
      admin: { readOnly: true, hidden: true },
    },
    {
      name: "flock",
      type: "relationship",
      relationTo: "flocks",
      required: true,
      label: "Mã đàn gà (Flock ID)",
    },
    {
      name: "date",
      type: "date",
      required: true,
      label: "Ngày ghi nhận",
    },
    {
      name: "ageInDays",
      type: "number",
      required: true,
      label: "Ngày tuổi",
    },
    {
      name: "birdCount",
      type: "number",
      label: "Số lượng con thực tế trong ngày",
    },
    {
      name: "feedProduct",
      type: "relationship",
      relationTo: "products",
      label: "Loại thức ăn sử dụng",
    },
    {
      name: "feedQtyEst",
      type: "number",
      label: "Lượng cám sử dụng ước tính (kg)",
    },
    {
      name: "feedQtyAct",
      type: "number",
      label: "Lượng cám sử dụng thực tế (kg)",
    },
    {
      name: "feedQtyIn",
      type: "number",
      defaultValue: 0,
      label: "Lượng cám nhập về trong ngày (kg)",
    },
    {
      name: "endQty",
      type: "number",
      required: true,
      label: "Tồn kho cám cuối ngày (kg)",
    },
    {
      name: "badgeStatus",
      type: "select",
      defaultValue: "NORMAL",
      options: [
        { label: "Bình thường (NORMAL)", value: "NORMAL" },
        { label: "Sắp hết cám (LOW)", value: "LOW" },
        { label: "Cảnh báo nguy cấp (CRITICAL)", value: "CRITICAL" },
        { label: "Hết cám hoàn toàn (ZERO)", value: "ZERO" },
      ],
      label: "Trạng thái cảnh báo tồn kho (Badge)",
    },
    {
      name: "migrationKey",
      type: "text",
      unique: true,
      admin: { readOnly: true, hidden: true },
    },
    { name: "feedState", type: "text" },
    { name: "mortAct", type: "number" },
    { name: "mortEst", type: "number" },
    { name: "populationEst", type: "number" },
    { name: "feedNameOrder", type: "text" },
    { name: "feedBeginQty", type: "number" },
    { name: "stockLevelPercentage", type: "number" },
    { name: "currentDay", type: "number" },
    { name: "dayCaseStudy", type: "text" },
    { name: "sourceColumn20", type: "text" },
    {
      name: "logId",
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
        if (operation === "create" && data && !data.logId) {
          data.logId = `FMS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        }
        return data;
      },
    ],
  },
};
