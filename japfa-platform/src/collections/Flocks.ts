import type { CollectionConfig } from "payload";
import { adminOnly } from "@/access/admin-only";

export const Flocks: CollectionConfig = {
  slug: "flocks",
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    useAsTitle: "flockId",
    defaultColumns: [
      "flockId",
      "tenant",
      "chickenType",
      "initialBirdCount",
      "startDate",
    ],
  },
  fields: [
    {
      name: "flockId",
      type: "text",
      required: true,
      unique: true,
      label: "Mã Đàn Gà",
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "tenant",
      type: "relationship",
      relationTo: "tenants",
      required: true,
      label: "Trại gà sở hữu",
    },
    {
      name: "chickenType",
      type: "text",
      required: true,
      label: "Loại Gà",
    },
    {
      name: "initialBirdCount",
      type: "number",
      required: true,
      label: "Số lượng con ban đầu",
    },
    {
      name: "startDate",
      type: "date",
      required: true,
      label: "Ngày vào đàn",
    },
    { name: "flockName", type: "text" },
    { name: "sourceFlockGroup", type: "text" },
    { name: "standardsApplied", type: "text" },
  ],
};
