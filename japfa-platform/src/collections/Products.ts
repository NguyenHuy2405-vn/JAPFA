import type { CollectionConfig } from "payload";
import { adminOnly } from "@/access/admin-only";

export const Products: CollectionConfig = {
  slug: "products",
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
      "name",
      "productType",
      "uom",
      "uomWeightKg",
      "status",
    ],
  },
  fields: [
    {
      name: "sku",
      type: "text",
      required: true,
      unique: true,
      label: "Mã SKU",
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "name",
      type: "text",
      required: true,
      label: "Tên hàng hóa",
    },
    {
      name: "productType",
      type: "text",
      required: true,
      defaultValue: "Chicken_feed",
      label: "Loại sản phẩm (Ví dụ: Chicken_feed)",
    },
    {
      name: "uom",
      type: "text",
      required: true,
      defaultValue: "Bao",
      label: "Đơn vị tính (UOM - Bao/Kg)",
    },
    {
      name: "uomWeightKg",
      type: "number",
      required: true,
      min: 0,
      defaultValue: 40,
      label: "Trọng lượng đơn vị (kg/UOM)",
    },
    {
      name: "stockAgeMin",
      type: "number",
      min: 0,
      label: "Ngày tuổi sử dụng tối thiểu",
    },
    {
      name: "stockAgeMax",
      type: "number",
      min: 0,
      label: "Ngày tuổi sử dụng tối đa",
    },
    {
      name: "status",
      type: "select",
      defaultValue: "ACTIVE",
      options: [
        { label: "Đang hoạt động (ACTIVE)", value: "ACTIVE" },
        { label: "Ngừng sử dụng (INACTIVE)", value: "INACTIVE" },
      ],
    },
    { name: "description", type: "textarea" },
  ],
};
