import type { CollectionConfig } from "payload";
import { adminOnly, adminAccess } from "@/access/admin-only";
import { denyAll } from "@/access/deny-all";
import { writeAudit } from "@/services/audit/audit.service";

export const Users: CollectionConfig = {
  slug: "users",
  access: {
    admin: adminAccess,
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: denyAll,
  },
  auth: true,
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "fullName", "accountStatus"],
  },
  fields: [
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "FARM",
      label: "Vai trò / Phân quyền hệ thống",
      options: [
        { label: "Admin Quản trị toàn hệ thống", value: "ADMIN" },
        { label: "Operator vận hành", value: "OPERATOR" },
        { label: "Farm người dùng trại", value: "FARM" },
      ],
    },
    {
      name: "fullName",
      type: "text",
      required: true,
      label: "Họ và tên",
    },
    {
      name: "phone",
      type: "text",
      label: "Số điện thoại",
    },
    {
      name: "accountStatus",
      type: "select",
      required: true,
      defaultValue: "ACTIVE",
      label: "Trạng thái tài khoản",
      options: [
        { label: "Hoạt động (ACTIVE)", value: "ACTIVE" },
        { label: "Tài khoản bị khóa (LOCKED)", value: "LOCKED" },
      ],
    },
    {
      name: "tenantMemberships",
      type: "relationship",
      relationTo: "tenants",
      hasMany: true,
      label: "Danh sách Tenant thuộc quản lý (Canonical Multi-tenancy)",
    },
    {
      name: "tenants",
      type: "relationship",
      relationTo: "tenants",
      hasMany: true,
      label: "Phạm vi Tenant / Farm được phép quản lý (Legacy Fallback)",
    },
    {
      name: "authzVersion",
      type: "number",
      required: true,
      defaultValue: 1,
      min: 1,
      label: "Phiên bản phân quyền (session invalidation)",
      admin: {
        readOnly: true,
        hidden: true,
        position: "sidebar",
      },
      access: {
        update: () => false,
      },
    },
    {
      name: "mustChangePassword",
      type: "checkbox",
      required: true,
      defaultValue: true,
      label: "Bắt buộc đổi mật khẩu khi đăng nhập lần đầu",
    },
    {
      name: "primaryTenant",
      type: "relationship",
      relationTo: "tenants",
      label: "Tenant chính (hiển thị UI / redirect sau login)",
    },
    {
      name: "createdBy",
      type: "relationship",
      relationTo: "users",
      label: "Người tạo tài khoản",
      admin: { readOnly: true },
      access: {
        update: () => false,
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        if (req.context?.migration || operation === "create" || !req.user)
          return;
        const actor = req.user;
        try {
          if (doc.role !== previousDoc?.role) {
            await writeAudit(req.payload, {
              actorUserId: actor.id,
              actorEmail: actor.email,
              actorRole: actor.role,
              action: "USER_ROLE_CHANGED",
              targetCollection: "users",
              targetId: doc.id,
              before: { role: previousDoc?.role },
              after: { role: doc.role },
            });
          }
          if (
            doc.accountStatus === "LOCKED" &&
            previousDoc?.accountStatus !== "LOCKED"
          ) {
            await writeAudit(req.payload, {
              actorUserId: actor.id,
              actorEmail: actor.email,
              actorRole: actor.role,
              action: "USER_LOCKED",
              targetCollection: "users",
              targetId: doc.id,
              before: { accountStatus: previousDoc?.accountStatus },
              after: { accountStatus: doc.accountStatus },
            });
          }
          if (
            doc.accountStatus === "ACTIVE" &&
            previousDoc?.accountStatus === "LOCKED"
          ) {
            await writeAudit(req.payload, {
              actorUserId: actor.id,
              actorEmail: actor.email,
              actorRole: actor.role,
              action: "USER_UNLOCKED",
              targetCollection: "users",
              targetId: doc.id,
              before: { accountStatus: previousDoc?.accountStatus },
              after: { accountStatus: doc.accountStatus },
            });
          }
        } catch (error) {
          console.error("[AUDIT_FAILED] user", error);
        }
      },
    ],
  },
};
