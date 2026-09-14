import type { CollectionConfig } from "payload";
import {
  operationsWrite,
  transferReadScope,
  denyAll,
} from "@/access/permissions";
import { isAdmin, isFarm, isOperation, userTenantIds } from "@/access/roles";
import {
  notifyTransferApproved,
  notifyTransferCompleted,
  notifyTransferIncoming,
  notifyTransferReceived,
  notifyTransferRejected,
} from "@/services/notification/notification.service";
import { writeAudit } from "@/services/audit/audit.service";

export const TransferRequests: CollectionConfig = {
  slug: "transfer-requests",
  access: {
    read: transferReadScope,
    create: operationsWrite,
    update: ({ req }) => {
      const actor = req.user;
      if (!actor) return false;

      if (isAdmin(actor.role) || isOperation(actor.role)) return true;

      if (isFarm(actor.role)) {
        const tenantIds = userTenantIds(actor);
        if (!tenantIds.length) return false;
        return { toTenant: { in: tenantIds } };
      }

      return false;
    },
    delete: denyAll,
  },
  admin: {
    useAsTitle: "transferId",
    defaultColumns: [
      "transferId",
      "fromTenant",
      "toTenant",
      "product",
      "quantity",
      "status",
    ],
  },
  fields: [
    {
      name: "transferId",
      type: "text",
      required: true,
      unique: true,
      label: "Mã Lệnh Điều Chuyển (Transfer ID)",
      admin: {
        readOnly: true,
        description: "Mã lệnh được tự động sinh (Ví dụ: TRF-000001)",
      },
    },
    {
      name: "fromTenant",
      type: "relationship",
      relationTo: "tenants",
      required: true,
      label: "Nơi chuyển (Xuất kho / Farm gửi)",
    },
    {
      name: "toTenant",
      type: "relationship",
      relationTo: "tenants",
      required: true,
      label: "Nơi nhận (Nhập kho / Farm nhận)",
    },
    {
      name: "product",
      type: "relationship",
      relationTo: "products",
      required: true,
      label: "Mã hàng hóa (SKU)",
    },
    {
      name: "quantity",
      type: "number",
      required: true,
      min: 0,
      label: "Số lượng điều chuyển",
    },
    {
      name: "uom",
      type: "text",
      defaultValue: "Bao",
      label: "Đơn vị tính",
    },
    {
      name: "status",
      type: "select",
      defaultValue: "DRAFT",
      required: true,
      options: [
        { label: "Bản nháp (DRAFT)", value: "DRAFT" },
        { label: "Đã gửi duyệt (SUBMITTED)", value: "SUBMITTED" },
        { label: "Đã phê duyệt (APPROVED)", value: "APPROVED" },
        { label: "Từ chối (REJECTED)", value: "REJECTED" },
        { label: "Đang vận chuyển (IN_TRANSIT)", value: "IN_TRANSIT" },
        { label: "Đã nhận hàng (RECEIVED)", value: "RECEIVED" },
        { label: "Hoàn tất (COMPLETED)", value: "COMPLETED" },
        { label: "Đã hủy (CANCELLED)", value: "CANCELLED" },
      ],
      label: "Trạng thái lệnh điều chuyển",
    },
    {
      name: "requestedBy",
      type: "relationship",
      relationTo: "users",
      label: "Người tạo yêu cầu",
    },
    {
      name: "approvedBy",
      type: "relationship",
      relationTo: "users",
      label: "Người phê duyệt",
    },
    {
      name: "receivedBy",
      type: "relationship",
      relationTo: "users",
      label: "Người xác nhận nhận hàng",
    },
    {
      name: "flock",
      type: "relationship",
      relationTo: "flocks",
      label: "Đàn gà nhận vật tư (nếu có)",
    },
    {
      name: "note",
      type: "textarea",
      label: "Ghi chú lệnh điều chuyển",
    },
    {
      name: "migrationKey",
      type: "text",
      unique: true,
      admin: { readOnly: true, hidden: true },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        if (operation === "create" && data && !data.transferId) {
          const timestamp = Date.now().toString(36).toUpperCase();
          const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
          data.transferId = `TRF-${timestamp}-${suffix}`;
        }
        return data;
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, req, operation }) => {
        if (req.context?.migration || operation !== "update") return data;

        const actor = req.user;
        if (!actor || !isFarm(actor.role)) return data;

        const nextStatus = String(data?.status || "");
        const prevStatus = String(originalDoc?.status || "");
        if (!(nextStatus === "RECEIVED" && prevStatus === "IN_TRANSIT")) {
          throw new Error(
            "FORBIDDEN: FARM chỉ được nhận điều chuyển IN_TRANSIT.",
          );
        }

        const changedKeys = Object.keys(data || {}).filter(
          (key) => key !== "status",
        );
        if (changedKeys.length > 0) {
          throw new Error(
            "FORBIDDEN: FARM chỉ được cập nhật trạng thái RECEIVED.",
          );
        }

        const tenantIds = userTenantIds(actor).map(String);
        const toTenant =
          typeof originalDoc?.toTenant === "object" && originalDoc?.toTenant
            ? String((originalDoc.toTenant as { id?: string | number }).id)
            : String(originalDoc?.toTenant || "");

        if (!tenantIds.includes(toTenant)) {
          throw new Error("FORBIDDEN: Bạn không phải Farm nhận hàng.");
        }

        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (req.context?.migration) return;

        try {
          if (doc.status === "APPROVED" && previousDoc?.status !== "APPROVED") {
            await notifyTransferApproved(req.payload, doc);
          }
          if (doc.status === "REJECTED" && previousDoc?.status !== "REJECTED") {
            await notifyTransferRejected(
              req.payload,
              doc,
              doc.note || "Không có lý do cụ thể",
            );
          }
          if (
            doc.status === "IN_TRANSIT" &&
            previousDoc?.status !== "IN_TRANSIT"
          ) {
            await notifyTransferIncoming(req.payload, doc);
          }
          if (doc.status === "RECEIVED" && previousDoc?.status !== "RECEIVED") {
            await notifyTransferReceived(req.payload, doc);
          }
          if (
            doc.status === "COMPLETED" &&
            previousDoc?.status !== "COMPLETED"
          ) {
            await notifyTransferCompleted(req.payload, doc);
          }
        } catch (notificationError) {
          console.error("[NOTIFICATION_FAILED] transfer", {
            transferId: doc.transferId,
            error:
              notificationError instanceof Error
                ? notificationError.message
                : String(notificationError),
          });
        }

        if (req.user) {
          try {
            if (
              doc.status === "APPROVED" &&
              previousDoc?.status !== "APPROVED"
            ) {
              await writeAudit(req.payload, {
                actorUserId: req.user.id,
                actorEmail: req.user.email,
                actorRole: req.user.role,
                action: "TRANSFER_APPROVED",
                targetCollection: "transfer-requests",
                targetId: doc.id,
              });
            }
            if (
              doc.status === "REJECTED" &&
              previousDoc?.status !== "REJECTED"
            ) {
              await writeAudit(req.payload, {
                actorUserId: req.user.id,
                actorEmail: req.user.email,
                actorRole: req.user.role,
                action: "TRANSFER_REJECTED",
                targetCollection: "transfer-requests",
                targetId: doc.id,
                after: { reason: doc.note },
              });
            }
            if (
              doc.status === "RECEIVED" &&
              previousDoc?.status !== "RECEIVED"
            ) {
              await writeAudit(req.payload, {
                actorUserId: req.user.id,
                actorEmail: req.user.email,
                actorRole: req.user.role,
                action: "TRANSFER_RECEIVED",
                targetCollection: "transfer-requests",
                targetId: doc.id,
              });
            }
          } catch (auditError) {
            console.error("[AUDIT_FAILED] transfer", auditError);
          }
        }
      },
    ],
  },
};
