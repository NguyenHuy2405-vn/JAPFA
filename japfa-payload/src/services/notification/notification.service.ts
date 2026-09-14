import type { Payload, Where } from "payload";

export type NotificationType =
  | "ORDER_APPROVED"
  | "ORDER_REJECTED"
  | "ORDER_INCOMING"
  | "ORDER_RECEIVED"
  | "ORDER_COMPLETED"
  | "ORDER_ISSUE"
  | "TRANSFER_APPROVED"
  | "TRANSFER_REJECTED"
  | "TRANSFER_INCOMING"
  | "TRANSFER_RECEIVED"
  | "TRANSFER_COMPLETED"
  | "TRANSFER_ISSUE";

type SendNotificationInput = {
  recipientId: string | number;
  type: NotificationType;
  title: string;
  message: string;
  relatedOrderId?: string | number;
  relatedTransferId?: string | number;
};

type OrderNotification = {
  id: string | number;
  orderId: string;
  tenant?: unknown;
  origin?: unknown;
  destination?: unknown;
};

type TransferNotification = {
  id: string | number;
  transferId: string;
  fromTenant?: unknown;
  toTenant?: unknown;
};

const relationId = (value: unknown): string | number | undefined =>
  typeof value === "object" && value !== null
    ? (value as { id?: string | number }).id
    : (value as string | number | undefined);

const numericId = (value: string | number | undefined): number | undefined => {
  const id = typeof value === "string" ? Number(value) : value;
  return typeof id === "number" && Number.isFinite(id) ? id : undefined;
};

const tenantName = (value: unknown, fallback: string) =>
  typeof value === "object" && value !== null && "name" in value
    ? String((value as { name?: unknown }).name || fallback)
    : fallback;

const resolveRecipientsByTenant = async (
  payload: Payload,
  tenantId: string | number | undefined,
): Promise<Array<string | number>> => {
  if (tenantId === undefined || tenantId === null || tenantId === "") {
    console.warn("[NOTIFICATION_RECIPIENTS_MISSING] tenant id is missing");
    return [];
  }

  const users = await payload.find({
    collection: "users",
    where: {
      and: [
        { role: { equals: "FARM" } },
        {
          or: [
            { primaryTenant: { equals: tenantId } },
            { tenantMemberships: { in: [tenantId] } },
          ],
        },
      ],
    },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  if (!users.docs.length) {
    console.warn("[NOTIFICATION_RECIPIENTS_MISSING] no FARM user", {
      tenantId,
    });
  }
  return users.docs.map((user) => user.id);
};

const resolveOperationRecipients = async (
  payload: Payload,
): Promise<Array<string | number>> => {
  const users = await payload.find({
    collection: "users",
    where: { role: { equals: "OPERATION" } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });
  return users.docs.map((user) => user.id);
};

export const sendNotification = async (
  payload: Payload,
  input: SendNotificationInput,
): Promise<void> => {
  const recipientId = numericId(input.recipientId);
  if (recipientId === undefined) {
    console.warn("[NOTIFICATION_RECIPIENT_INVALID]", {
      type: input.type,
    });
    return;
  }
  const and: Where[] = [
    { recipient: { equals: recipientId } },
    { type: { equals: input.type } },
  ];
  if (input.relatedOrderId !== undefined) {
    and.push({ relatedOrder: { equals: numericId(input.relatedOrderId) } });
  }
  if (input.relatedTransferId !== undefined) {
    and.push({
      relatedTransfer: { equals: numericId(input.relatedTransferId) },
    });
  }

  const existing = await payload.find({
    collection: "notifications",
    where: { and },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (existing.docs.length) return;

  await payload.create({
    collection: "notifications",
    data: {
      recipient: recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedOrder: numericId(input.relatedOrderId),
      relatedTransfer: numericId(input.relatedTransferId),
      isRead: false,
    },
    draft: false,
    overrideAccess: true,
  });
};

const notifyTenantRecipients = async (
  payload: Payload,
  tenant: unknown,
  input: Omit<SendNotificationInput, "recipientId">,
) => {
  const recipients = await resolveRecipientsByTenant(
    payload,
    relationId(tenant),
  );
  for (const recipientId of recipients) {
    await sendNotification(payload, { ...input, recipientId });
  }
};

const notifyBothTenants = async (
  payload: Payload,
  first: unknown,
  second: unknown,
  input: Omit<SendNotificationInput, "recipientId">,
) => {
  const ids = new Set<string | number>();
  for (const tenant of [first, second]) {
    for (const recipientId of await resolveRecipientsByTenant(
      payload,
      relationId(tenant),
    )) {
      ids.add(recipientId);
    }
  }
  for (const recipientId of ids) {
    await sendNotification(payload, { ...input, recipientId });
  }
};

export const notifyOrderApproved = (
  payload: Payload,
  order: OrderNotification,
) =>
  notifyTenantRecipients(payload, order.tenant, {
    type: "ORDER_APPROVED",
    title: "Đơn hàng đã được duyệt",
    message: `Đơn ${order.orderId} đã được duyệt. Hàng sẽ được xuất kho trong hôm nay.`,
    relatedOrderId: order.id,
  });

export const notifyOrderRejected = (
  payload: Payload,
  order: OrderNotification,
  reason: string,
) =>
  notifyTenantRecipients(payload, order.tenant, {
    type: "ORDER_REJECTED",
    title: "Đơn hàng bị từ chối",
    message: `Đơn ${order.orderId} bị từ chối. Lý do: ${reason}`,
    relatedOrderId: order.id,
  });

export const notifyOrderIncoming = (
  payload: Payload,
  order: OrderNotification,
) =>
  notifyTenantRecipients(payload, order.destination, {
    type: "ORDER_INCOMING",
    title: "Có hàng đến",
    message: `Đơn ${order.orderId} đang trên đường đến từ ${tenantName(order.origin, "Farm khác")}.`,
    relatedOrderId: order.id,
  });

export const notifyOrderReceived = (
  payload: Payload,
  order: OrderNotification,
) =>
  notifyTenantRecipients(payload, order.origin, {
    type: "ORDER_RECEIVED",
    title: "Hàng đã được nhận",
    message: `${tenantName(order.destination, "Farm nhận")} đã nhận hàng cho đơn ${order.orderId}.`,
    relatedOrderId: order.id,
  });

export const notifyOrderCompleted = (
  payload: Payload,
  order: OrderNotification,
) =>
  notifyBothTenants(payload, order.origin, order.destination, {
    type: "ORDER_COMPLETED",
    title: "Đơn hàng hoàn tất",
    message: `Đơn ${order.orderId} đã hoàn tất.`,
    relatedOrderId: order.id,
  });

export const notifyOrderIssue = async (
  payload: Payload,
  order: Pick<OrderNotification, "id" | "orderId">,
  farmName: string,
  issue: string,
) => {
  for (const recipientId of await resolveOperationRecipients(payload)) {
    await sendNotification(payload, {
      recipientId,
      type: "ORDER_ISSUE",
      title: "Báo cáo sự cố đơn",
      message: `${farmName} báo cáo vấn đề cho đơn ${order.orderId}: ${issue}`,
      relatedOrderId: order.id,
    });
  }
};

export const notifyTransferApproved = (
  payload: Payload,
  transfer: TransferNotification,
) =>
  notifyTenantRecipients(payload, transfer.fromTenant, {
    type: "TRANSFER_APPROVED",
    title: "Lệnh điều chuyển đã được duyệt",
    message: `Lệnh ${transfer.transferId} đã được duyệt.`,
    relatedTransferId: transfer.id,
  });

export const notifyTransferRejected = (
  payload: Payload,
  transfer: TransferNotification,
  reason: string,
) =>
  notifyTenantRecipients(payload, transfer.fromTenant, {
    type: "TRANSFER_REJECTED",
    title: "Lệnh điều chuyển bị từ chối",
    message: `Lệnh ${transfer.transferId} bị từ chối. Lý do: ${reason}`,
    relatedTransferId: transfer.id,
  });

export const notifyTransferIncoming = (
  payload: Payload,
  transfer: TransferNotification,
) =>
  notifyTenantRecipients(payload, transfer.toTenant, {
    type: "TRANSFER_INCOMING",
    title: "Hàng điều chuyển đang đến",
    message: `Lệnh ${transfer.transferId} đang trên đường đến.`,
    relatedTransferId: transfer.id,
  });

export const notifyTransferReceived = (
  payload: Payload,
  transfer: TransferNotification,
) =>
  notifyTenantRecipients(payload, transfer.fromTenant, {
    type: "TRANSFER_RECEIVED",
    title: "Hàng điều chuyển đã được nhận",
    message: `Lệnh ${transfer.transferId} đã được bên nhận xác nhận.`,
    relatedTransferId: transfer.id,
  });

export const notifyTransferCompleted = (
  payload: Payload,
  transfer: TransferNotification,
) =>
  notifyBothTenants(payload, transfer.fromTenant, transfer.toTenant, {
    type: "TRANSFER_COMPLETED",
    title: "Điều chuyển hoàn tất",
    message: `Lệnh ${transfer.transferId} đã hoàn tất.`,
    relatedTransferId: transfer.id,
  });

export const notifyTransferIssue = async (
  payload: Payload,
  transfer: Pick<TransferNotification, "id" | "transferId">,
  farmName: string,
  issue: string,
) => {
  for (const recipientId of await resolveOperationRecipients(payload)) {
    await sendNotification(payload, {
      recipientId,
      type: "TRANSFER_ISSUE",
      title: "Báo cáo sự cố điều chuyển",
      message: `${farmName} báo cáo vấn đề cho lệnh ${transfer.transferId}: ${issue}`,
      relatedTransferId: transfer.id,
    });
  }
};

export const renderTemplate = (
  template: string,
  vars: Record<string, string>,
): string => {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
};
