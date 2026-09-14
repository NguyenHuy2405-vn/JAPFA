import type { CollectionConfig } from "payload";
import {
  wmsTenantWrite,
  tenantScoped,
  denyAll,
} from "@/access/permissions";

export const WmsTransactions: CollectionConfig = {
  slug: "wms-transactions",
  access: {
    read: tenantScoped("tenant"),
    create: wmsTenantWrite,
    // Inventory history is append-only. Corrections must be new adjustments.
    update: denyAll,
    delete: denyAll,
  },
  admin: {
    useAsTitle: "id",
    defaultColumns: [
      "date",
      "scope",
      "tenant",
      "product",
      "txnType",
      "quantity",
      "order",
      "reason",
    ],
  },
  fields: [
    {
      name: "scope",
      type: "select",
      required: true,
      defaultValue: "FACTORY",
      options: [
        { label: "Nhà máy (FACTORY)", value: "FACTORY" },
        { label: "Trại gà (FARM)", value: "FARM" },
      ],
    },
    {
      name: "tenant",
      type: "relationship",
      relationTo: "tenants",
      required: true,
      label: "Tenant (Nhà máy / Farm)",
    },
    {
      name: "flock",
      type: "relationship",
      relationTo: "flocks",
      label: "Đàn gà (Chỉ dành cho Farm)",
    },
    {
      name: "product",
      type: "relationship",
      relationTo: "products",
      required: true,
      label: "Mã hàng hóa (SKU)",
    },
    {
      name: "txnType",
      type: "select",
      required: true,
      options: [
        { label: "Nhập kho (INBOUND)", value: "INBOUND" },
        { label: "Xuất kho (OUTBOUND)", value: "OUTBOUND" },
        { label: "Hao hụt (LOSS)", value: "LOSS" },
        { label: "Báo cáo tồn (REPORT)", value: "REPORT" },
        { label: "Điều chỉnh kiểm kê (ADJUSTMENT)", value: "ADJUSTMENT" },
        { label: "Tiêu thụ tại trại (CONSUME)", value: "CONSUME" },
      ],
    },
    {
      name: "quantity",
      type: "number",
      required: true,
      label: "Số lượng biến động",
    },
    {
      name: "order",
      type: "relationship",
      relationTo: "orders",
      label: "Đơn hàng liên quan (OMS Order ID)",
    },
    {
      name: "reason",
      type: "text",
      label: "Lý do (Dành cho Adjustment / Kiểm kê)",
    },
    {
      name: "date",
      type: "date",
      required: true,
      defaultValue: () => new Date(),
      label: "Ngày giao dịch",
    },
    {
      name: "note",
      type: "textarea",
      label: "Ghi chú giao dịch",
    },
    {
      name: "migrationKey",
      type: "text",
      unique: true,
      admin: { readOnly: true, hidden: true },
    },
    { name: "transactionId", type: "text" },
    { name: "dateInput", type: "date" },
    { name: "ageInDays", type: "number" },
    { name: "beginQuantity", type: "number" },
    { name: "inQuantity", type: "number" },
    { name: "outQuantity", type: "number" },
    { name: "endQuantity", type: "number" },
    { name: "endOrderQuantity", type: "number" },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        if (operation !== "create" || !data) return data;

        const scope = data.scope;
        const txnType = data.txnType;
        const quantity = Number(data.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error("Số lượng giao dịch phải lớn hơn 0.");
        }
        if (scope === "FARM" && !data.flock) {
          throw new Error("Giao dịch kho Farm phải có Flock.");
        }
        if (scope === "FACTORY" && txnType === "CONSUME") {
          throw new Error("Kho Factory không hỗ trợ giao dịch Consume.");
        }
        if (["ADJUSTMENT", "LOSS"].includes(String(txnType)) && !data.reason) {
          throw new Error("Giao dịch điều chỉnh hoặc hao hụt phải có lý do.");
        }
        return data;
      },
    ],
  },
};
