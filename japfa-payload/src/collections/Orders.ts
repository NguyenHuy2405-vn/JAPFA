import type { CollectionConfig } from "payload";
import {
  omsTenantWrite,
  operationsWrite,
  orderReadScope,
  denyAll,
} from "@/access/permissions";
import {
  notifyOrderApproved,
  notifyOrderCompleted,
  notifyOrderIncoming,
  notifyOrderReceived,
  notifyOrderRejected,
} from "@/services/notification/notification.service";
import { writeAudit } from "@/services/audit/audit.service";

export const Orders: CollectionConfig = {
  slug: "orders",
  access: {
    read: orderReadScope,
    create: omsTenantWrite,
    update: operationsWrite,
    delete: denyAll,
  },
  admin: {
    useAsTitle: "orderId",
    defaultColumns: [
      "orderId",
      "tenant",
      "client",
      "origin",
      "destination",
      "product",
      "quantity",
      "status",
    ],
  },
  fields: [
    {
      name: "orderId",
      type: "text",
      required: true,
      unique: true,
      label: "Mã Đơn Hàng (Order ID)",
      admin: {
        readOnly: true,
        description:
          "Mã đơn được hệ thống tự động sinh (Ví dụ: WMS_1-ORD-000001)",
      },
    },
    {
      name: "tenant",
      type: "relationship",
      relationTo: "tenants",
      required: true,
      label: "Tenant đặt hàng (Chủ Order)",
    },
    {
      name: "client",
      type: "text",
      required: true,
      label: "Tên Khách hàng / Đơn vị đặt",
    },
    {
      name: "origin",
      type: "relationship",
      relationTo: "tenants",
      required: true,
      label: "Nơi đi (Nhà máy / Farm gửi)",
    },
    {
      name: "destination",
      type: "relationship",
      relationTo: "tenants",
      required: true,
      label: "Nơi đến (Trại nhận)",
    },
    {
      name: "originDisplay",
      type: "text",
      label: "Nơi gửi hiển thị theo nguồn",
    },
    {
      name: "destinationDisplay",
      type: "text",
      label: "Nơi nhận hiển thị theo nguồn",
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
      label: "Số lượng đặt",
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
    },
    {
      name: "pickupDate",
      type: "date",
      label: "Ngày lấy hàng",
    },
    {
      name: "expectedDeliveryDate",
      type: "date",
      label: "Ngày giao hàng (Dự kiến)",
    },
    {
      name: "actualDeliveryDate",
      type: "date",
      label: "Ngày giao hàng (Thực tế)",
    },
    {
      name: "flock",
      type: "relationship",
      relationTo: "flocks",
      label: "Đàn gà thụ hưởng (Flock ID)",
    },
    {
      name: "note",
      type: "textarea",
      label: "Ghi chú đơn hàng",
    },
    {
      name: "migrationKey",
      type: "text",
      unique: true,
      admin: { readOnly: true, hidden: true },
    },
    { name: "createDate", type: "date" },
    { name: "location", type: "text" },
    { name: "tmsOrderId", type: "text" },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        // Tự động sinh Order ID nếu tạo mới
        if (operation === "create" && data && !data.orderId) {
          const tenant =
            typeof data.tenant === "object"
              ? data.tenant.tenantId
              : String(data.tenant || "WMS");
          const timestamp = Date.now().toString(36).toUpperCase();
          const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
          data.orderId = `${tenant}-ORD-${timestamp}-${suffix}`;
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (req.context?.migration) return;
        const writeLedger = async ({
          scope,
          tenant,
          txnType,
          note,
        }: {
          scope: "FACTORY" | "FARM";
          tenant: number | string;
          txnType: "INBOUND" | "OUTBOUND";
          note: string;
        }) => {
          const relationId = (value: unknown) =>
            typeof value === "object" && value !== null
              ? (value as { id?: string | number }).id
              : value;
          const tenantId = relationId(tenant);
          const productId = relationId(doc.product);
          if (tenantId === undefined || tenantId === null || tenantId === "")
            throw new Error(
              "INVALID_ORDER_TENANT: Tenant của order không hợp lệ.",
            );
          if (productId === undefined || productId === null || productId === "")
            throw new Error(
              "INVALID_ORDER_PRODUCT: SKU của order không hợp lệ.",
            );
          const quantity = Number(doc.quantity);
          if (!Number.isFinite(quantity) || quantity <= 0)
            throw new Error(
              "INVALID_ORDER_QUANTITY: Số lượng order không hợp lệ.",
            );
          const existing = await req.payload.find({
            collection: "wms-transactions",
            where: {
              and: [
                { order: { equals: doc.id } },
                { txnType: { equals: txnType } },
              ],
            },
            limit: 1,
            depth: 0,
            overrideAccess: true,
            req,
          });
          if (existing.docs.length) return;

          const latest = await req.payload.find({
            collection: "wms-transactions",
            where: {
              and: [
                { scope: { equals: scope } },
                { tenant: { equals: tenantId } },
                { product: { equals: productId } },
              ],
            },
            limit: 1,
            depth: 0,
            sort: "-date",
            overrideAccess: true,
            req,
          });
          const beginQuantity = Number(latest.docs[0]?.endQuantity ?? 0);
          if (!Number.isFinite(beginQuantity))
            throw new Error(
              "INVALID_LEDGER_BALANCE: Tồn kho hiện tại không hợp lệ.",
            );
          if (txnType === "OUTBOUND" && beginQuantity < quantity) {
            throw new Error(
              `INSUFFICIENT_STOCK: Tồn kho hiện tại (${beginQuantity}) không đủ để xuất ${quantity}.`,
            );
          }
          const inQuantity = txnType === "INBOUND" ? quantity : 0;
          const outQuantity = txnType === "OUTBOUND" ? quantity : 0;
          await req.payload.create({
            collection: "wms-transactions",
            data: {
              scope,
              tenant,
              flock: scope === "FARM" ? doc.flock : undefined,
              product: productId,
              txnType,
              quantity,
              beginQuantity,
              inQuantity,
              outQuantity,
              endQuantity: beginQuantity + inQuantity - outQuantity,
              order: doc.id,
              date: new Date().toISOString(),
              note,
            } as never,
            overrideAccess: true,
            req,
          });
        };

        if (
          doc.status === "IN_TRANSIT" &&
          previousDoc?.status !== "IN_TRANSIT"
        ) {
          await writeLedger({
            scope: "FACTORY",
            tenant: doc.origin,
            txnType: "OUTBOUND",
            note: `Tự động xuất kho theo đơn hàng ${doc.orderId}`,
          });
        }
        if (doc.status === "RECEIVED" && previousDoc?.status !== "RECEIVED") {
          await writeLedger({
            scope: "FARM",
            tenant: doc.destination,
            txnType: "INBOUND",
            note: `Tự động nhập kho theo đơn hàng ${doc.orderId}`,
          });
        }

        try {
          if (doc.status === "APPROVED" && previousDoc?.status !== "APPROVED") {
            await notifyOrderApproved(req.payload, doc);
          }
          if (doc.status === "REJECTED" && previousDoc?.status !== "REJECTED") {
            await notifyOrderRejected(
              req.payload,
              doc,
              doc.note || "Không có lý do cụ thể",
            );
          }
          if (
            doc.status === "IN_TRANSIT" &&
            previousDoc?.status !== "IN_TRANSIT"
          ) {
            await notifyOrderIncoming(req.payload, doc);
          }
          if (doc.status === "RECEIVED" && previousDoc?.status !== "RECEIVED") {
            await notifyOrderReceived(req.payload, doc);
          }
          if (
            doc.status === "COMPLETED" &&
            previousDoc?.status !== "COMPLETED"
          ) {
            await notifyOrderCompleted(req.payload, doc);
          }
        } catch (notificationError) {
          console.error("[NOTIFICATION_FAILED] order", {
            orderId: doc.orderId,
            error:
              notificationError instanceof Error
                ? notificationError.message
                : String(notificationError),
          });
        }

        if (req.user) {
          try {
            if (doc.status === "APPROVED" && previousDoc?.status !== "APPROVED") {
              await writeAudit(req.payload, { actorUserId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: "ORDER_APPROVED", targetCollection: "orders", targetId: doc.id });
            }
            if (doc.status === "REJECTED" && previousDoc?.status !== "REJECTED") {
              await writeAudit(req.payload, { actorUserId: req.user.id, actorEmail: req.user.email, actorRole: req.user.role, action: "ORDER_REJECTED", targetCollection: "orders", targetId: doc.id, after: { reason: doc.note } });
            }
          } catch (auditError) {
            console.error("[AUDIT_FAILED] order", auditError);
          }
        }
      },
    ],
  },
};
