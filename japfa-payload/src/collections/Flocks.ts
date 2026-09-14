import type { CollectionConfig } from "payload";
import { denyAll, fmsTenantWrite, tenantScoped } from "@/access/permissions";

export const Flocks: CollectionConfig = {
  slug: "flocks",
  access: {
    read: tenantScoped(),
    create: fmsTenantWrite,
    update: fmsTenantWrite,
    delete: denyAll,
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
      label: "Mã Đàn Gà (Flock ID - Ví dụ: CKMN0545/0004)",
    },
    {
      name: "tenant",
      type: "relationship",
      relationTo: "tenants",
      required: true,
      label: "Trại gà sở hữu (Tenant)",
    },
    {
      name: "chickenType",
      type: "text",
      required: true,
      label: "Loại Gà (Ví dụ: ChoiNoi_Male_GiaLai)",
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
