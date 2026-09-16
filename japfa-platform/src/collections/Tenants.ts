import type { CollectionConfig } from "payload";
import { adminOnly } from "@/access/admin-only";
import { writeAudit } from "@/services/audit/audit.service";
import { createFarmWorkflow } from "@/workflows/create-farm";

export const Tenants: CollectionConfig = {
  slug: "tenants",
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["tenantId", "name", "system", "type"],
  },
  fields: [
    {
      name: "farmCode",
      type: "text",
      required: true,
      unique: true,
      label: "Mã trang trại",
      admin: {
        description: "VD: FARM-BD-01, FAC-LA-02",
      },
    },
    {
      name: "tenantId",
      type: "text",
      required: true,
      unique: true,
      label: "Tenant ID",
      admin: { readOnly: true },
      access: { update: () => false },
    },
    {
      name: "name",
      type: "text",
      required: true,
      label: "Tên hiển thị",
    },
    {
      name: "system",
      type: "select",
      defaultValue: "WMS",
      options: [
        { label: "WMS", value: "WMS" },
        { label: "FMS", value: "FMS" },
        { label: "OMS", value: "OMS" },
        { label: "TMS", value: "TMS" },
      ],
    },
    {
      name: "type",
      type: "select",
      required: true,
      defaultValue: "FARM",
      options: [
        { label: "Nhà máy", value: "FACTORY" },
        { label: "Trại gà", value: "FARM" },
      ],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "ACTIVE",
      label: "Trạng thái hoạt động Tenant",
      options: [
        { label: "Hoạt động", value: "ACTIVE" },
        { label: "Tạm ngưng", value: "INACTIVE" },
        { label: "Bị khóa", value: "LOCKED" },
      ],
    },
    {
      name: "flockId",
      type: "text",
      label: "Flock ID mặc định gán cho Tenant",
    },
    { name: "updatedBy", type: "text" },
    { name: "managedBy", type: "text" },
    {
      name: "managedByUser",
      type: "relationship",
      relationTo: "users",
      label: "Người quản lý trang trại",
    },
    { name: "addressOfTenant", type: "text" },
    {
      name: "phone",
      type: "text",
      label: "Số điện thoại trang trại",
    },
    {
      name: "contactEmail",
      type: "email",
      label: "Email người quản lý trang trại",
    },
    {
      name: "contactName",
      type: "text",
      label: "Tên người quản lý trang trại",
    },
    { name: "flockName", type: "text" },
    { name: "standardsApplied", type: "text" },
    { name: "startFlockCount", type: "number" },
    { name: "startFlockDate", type: "date" },
  ],
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        if (req.context?.migration || operation === "create" || !req.user)
          return;
        const actor = req.user;
        try {
          if (doc.status === "LOCKED" && previousDoc?.status !== "LOCKED") {
            await writeAudit(req.payload, {
              actorUserId: actor.id,
              actorEmail: actor.email,
              actorRole: actor.role,
              action: "FARM_LOCKED",
              targetCollection: "tenants",
              targetId: doc.id,
              before: { status: previousDoc?.status },
              after: { status: doc.status },
            });
          }
          if (doc.status === "ACTIVE" && previousDoc?.status === "LOCKED") {
            await writeAudit(req.payload, {
              actorUserId: actor.id,
              actorEmail: actor.email,
              actorRole: actor.role,
              action: "FARM_UNLOCKED",
              targetCollection: "tenants",
              targetId: doc.id,
              before: { status: previousDoc?.status },
              after: { status: doc.status },
            });
          }
        } catch (error) {
          console.error("[AUDIT_FAILED] tenant", error);
        }
      },
      createFarmWorkflow,
    ],
  },
};
