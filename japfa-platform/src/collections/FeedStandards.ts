import type { CollectionConfig } from "payload";
import { adminOnly } from "@/access/admin-only";

export const FeedStandards: CollectionConfig = {
  slug: "feed-standards",
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    useAsTitle: "id",
    defaultColumns: ["chickenType", "ageInDays", "feedQtyPerBirdPerDay"],
  },
  fields: [
    {
      name: "chickenType",
      type: "text",
      required: true,
      label: "Loại Gà",
    },
    {
      name: "ageInDays",
      type: "number",
      required: true,
      min: 0,
      label: "Ngày Tuổi",
    },
    {
      name: "feedQtyPerBirdPerDay",
      type: "number",
      required: true,
      min: 0,
      label: "Thức ăn tiêu thụ chuẩn (g/con/ngày)",
    },
    {
      name: "cumFeedQty",
      type: "number",
      min: 0,
      label: "Thức ăn tích lũy (g/con)",
    },
    {
      name: "fcr",
      type: "number",
      min: 0,
      label: "FCR",
    },
    {
      name: "cumDepPercent",
      type: "number",
      label: "Cum. Dep (%)",
    },
    {
      name: "bwGr",
      type: "number",
      min: 0,
      label: "BW (gr)",
    },
    {
      name: "feedName",
      type: "text",
      label: "Loại cám theo bảng gốc",
    },
    {
      name: "migrationKey",
      type: "text",
      unique: true,
      admin: { readOnly: true, hidden: true },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "ACTIVE",
      label: "Trạng thái hoạt động",
      options: [
        { label: "Đang dùng (ACTIVE)", value: "ACTIVE" },
        { label: "Ngừng dùng (INACTIVE)", value: "INACTIVE" },
      ],
    },
    {
      name: "standardId",
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
        if (operation === "create" && data && !data.standardId) {
          data.standardId = `FST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        }
        return data;
      },
    ],
  },
};
