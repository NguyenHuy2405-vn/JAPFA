import {
  findOneByField,
  resolveTenantByDisplay,
  type PayloadClient,
} from "@/repositories/payload.repository";
import {
  ApiError,
  requireRole,
  requiredText,
  positiveNumber,
  type AuthUser,
} from "@/server/http/api-error";
import {
  canTransitionOrderStatus,
  ORDER_STATUS_RANK,
  type OrderStatus,
} from "@/domains/orders/state-machine";
import { withLockedSequentialTmsIds } from "@/domains/orders/tms-id";

const genOrderId = () =>
  `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const assignSequentialTmsIds = async (
  payload: PayloadClient,
  user: AuthUser,
  orderIdGroups: string[][],
  orderRecordIds: Map<string, string | number>,
) =>
  withLockedSequentialTmsIds(
    payload,
    user,
    orderIdGroups.length,
    async (tmsOrderIds) => {
      const assignments: Array<{ tmsOrderId: string; orderIds: string[] }> = [];
      for (const [groupIndex, group] of orderIdGroups.entries()) {
        const tmsOrderId = tmsOrderIds[groupIndex];
        for (const orderId of group) {
          const orderRecordId = orderRecordIds.get(orderId);
          if (!orderRecordId)
            throw new ApiError(
              `Không tìm thấy bản ghi cho Order ${orderId}.`,
              404,
            );
          await payload.update({
            collection: "orders",
            id: orderRecordId,
            data: { tmsOrderId },
            user: user as never,
            overrideAccess: false,
          });
        }
        assignments.push({ tmsOrderId, orderIds: group });
      }
      return assignments;
    },
  );

async function resolveOrigin(
  payload: PayloadClient,
  displayValue: unknown,
  user: AuthUser,
) {
  let origin = await resolveTenantByDisplay(payload, displayValue, user);
  if (!origin) {
    const factories = await payload.find({
      collection: "tenants",
      where: { type: { equals: "FACTORY" } },
      limit: 1,
      depth: 0,
      user: user as never,
      overrideAccess: false,
    });
    origin = factories.docs[0] as any;
  }
  return origin;
}

export async function createOrder(
  payload: PayloadClient,
  user: AuthUser,
  body: Record<string, any>,
) {
  requireRole(user, ["ADMIN", "PROCUREMENT"]);
  const {
    tenant_id,
    client,
    ma_hang,
    so_luong,
    uom,
    noi_i,
    noi_en,
    flock_id,
    pickup_date,
    expected_delivery_date,
    note,
  } = body;
  const tenantId = requiredText(tenant_id, "Tenant");
  const sku = requiredText(ma_hang, "SKU");
  const quantity = positiveNumber(so_luong, "Số lượng");

  const tenant = await findOneByField(
    payload,
    "tenants",
    "tenantId",
    tenantId,
    user,
  );
  const product = await findOneByField(payload, "products", "sku", sku, user);
  const origin = await resolveOrigin(payload, noi_i || "Nhà máy", user);
  const destination = await resolveTenantByDisplay(
    payload,
    noi_en || "Farm",
    user,
  );
  const flock = await findOneByField(
    payload,
    "flocks",
    "flockId",
    requiredText(flock_id, "Mã đàn gà"),
    user,
  );
  if (!tenant || !product || !origin || !destination || !flock)
    throw new ApiError(
      "Tenant, sản phẩm, nơi đi, nơi đến và mã đàn gà phải tồn tại trong Payload.",
    );
  if (origin.id === destination.id)
    throw new ApiError("Nơi đi và nơi đến không được trùng nhau.");
  if (String(flock.tenant) !== String(destination.id))
    throw new ApiError("Mã đàn gà không thuộc Farm nhận đã chọn.");
  if (String(tenant.id) !== String(destination.id))
    throw new ApiError("Tenant đặt hàng phải là Farm nhận của đơn hàng.");

  return payload.create({
    collection: "orders",
    data: {
      orderId: genOrderId(),
      tenant: tenant.id,
      client: requiredText(client || tenantId, "Khách hàng"),
      product: product.id,
      origin: origin.id,
      destination: destination.id,
      quantity,
      uom: uom || "Bao",
      flock: flock.id,
      originDisplay: noi_i || origin.name || origin.tenantId,
      destinationDisplay: noi_en || destination.name || destination.tenantId,
      pickupDate: pickup_date || undefined,
      expectedDeliveryDate: expected_delivery_date || undefined,
      status: "DRAFT",
      note: note || "Tạo mới từ Dashboard",
    },
    user: user as never,
    overrideAccess: false,
  });
}

export async function updateOrder(
  payload: PayloadClient,
  user: AuthUser,
  body: Record<string, any>,
) {
  requireRole(user, ["ADMIN", "PROCUREMENT"]);
  const orderId = requiredText(body.orderId, "Order ID");
  const order = await findOneByField(
    payload,
    "orders",
    "orderId",
    orderId,
    user,
  );
  if (!order) throw new ApiError("Không tìm thấy đơn hàng.", 404);
  if (order.status === "COMPLETED")
    throw new ApiError("Đơn đã hoàn tất và không thể chỉnh sửa.");
  const sku = requiredText(body.ma_hang, "SKU");
  const quantity = positiveNumber(body.so_luong, "Số lượng");
  const tenant =
    typeof order.tenant === "object" && order.tenant !== null
      ? order.tenant
      : await payload.findByID({
          collection: "tenants",
          id: order.tenant,
          depth: 0,
          user: user as never,
          overrideAccess: false,
        });
  const product = await findOneByField(payload, "products", "sku", sku, user);
  const origin = await resolveOrigin(payload, body.noi_i, user);
  const destination = await resolveTenantByDisplay(payload, body.noi_en, user);
  const flock = await findOneByField(
    payload,
    "flocks",
    "flockId",
    requiredText(body.flock_id, "Mã đàn gà"),
    user,
  );
  if (!tenant || !product || !origin || !destination || !flock)
    throw new ApiError("Tenant, SKU, nơi gửi và nơi nhận phải tồn tại.");
  if (origin.id === destination.id)
    throw new ApiError("Nơi đi và nơi đến không được trùng nhau.");
  if (String(flock.tenant) !== String(destination.id))
    throw new ApiError("Mã đàn gà không thuộc Farm nhận đã chọn.");
  if (String(tenant.id) !== String(destination.id))
    throw new ApiError("Tenant đặt hàng phải là Farm nhận của đơn hàng.");

  return payload.update({
    collection: "orders",
    id: order.id,
    data: {
      tenant: tenant.id,
      client: requiredText(body.client, "Khách hàng"),
      product: product.id,
      origin: origin.id,
      destination: destination.id,
      quantity,
      uom: body.uom || "Bao",
      flock: flock.id,
      originDisplay: body.noi_i || origin.name || origin.tenantId,
      destinationDisplay:
        body.noi_en || destination.name || destination.tenantId,
      pickupDate: body.pickup_date || undefined,
      expectedDeliveryDate: body.expected_delivery_date || undefined,
      note: body.note || "",
    },
    user: user as never,
    overrideAccess: false,
  });
}

export async function updateOrderStatus(
  payload: PayloadClient,
  user: AuthUser,
  body: Record<string, any>,
) {
  requireRole(user, ["ADMIN", "PROCUREMENT"]);
  const orderId = requiredText(body.orderId, "Order ID");
  const nextStatus = requiredText(body.status, "Trạng thái").toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(ORDER_STATUS_RANK, nextStatus))
    throw new ApiError("Trạng thái đơn hàng không hợp lệ.");
  const typedStatus = nextStatus as OrderStatus;
  const order = await findOneByField(
    payload,
    "orders",
    "orderId",
    orderId,
    user,
  );
  if (!order) throw new ApiError("Không tìm thấy đơn hàng.", 404);
  const previousStatus = String(order.status || "DRAFT");
  if (previousStatus === "COMPLETED")
    throw new ApiError("Đơn đã hoàn tất và không thể cập nhật.");
  if (!canTransitionOrderStatus(previousStatus, typedStatus))
    throw new ApiError("Không thể chuyển đơn về trạng thái trước đó.");

  if (
    ORDER_STATUS_RANK[typedStatus] >= ORDER_STATUS_RANK.IN_TRANSIT &&
    (!Object.prototype.hasOwnProperty.call(ORDER_STATUS_RANK, previousStatus) ||
      ORDER_STATUS_RANK[previousStatus as OrderStatus] <
        ORDER_STATUS_RANK.IN_TRANSIT)
  ) {
    const originId =
      typeof (order as any).origin === "object" && (order as any).origin
        ? (order as any).origin.id
        : (order as any).origin;
    const productId =
      typeof (order as any).product === "object" && (order as any).product
        ? (order as any).product.id
        : (order as any).product;
    if (originId === undefined || productId === undefined)
      throw new ApiError("Order thiếu nơi gửi hoặc sản phẩm hợp lệ.", 409);
    const latest = await payload.find({
      collection: "wms-transactions",
      where: {
        and: [
          { scope: { equals: "FACTORY" } },
          { tenant: { equals: originId } },
          { product: { equals: productId } },
        ],
      },
      limit: 1,
      depth: 0,
      sort: "-date",
      user: user as never,
      overrideAccess: false,
    });
    const currentQuantity = Number(latest.docs[0]?.endQuantity ?? 0);
    if (currentQuantity < Number(order.quantity || 0))
      throw new ApiError(
        `Tồn kho tại nơi đi (${currentQuantity}) không đủ để xuất ${order.quantity}.`,
        409,
      );
  }

  return payload.update({
    collection: "orders",
    id: order.id,
    data: {
      status: typedStatus as any,
      ...(typedStatus === "COMPLETED"
        ? { actualDeliveryDate: new Date().toISOString() }
        : {}),
    },
    user: user as never,
    overrideAccess: false,
  });
}

export async function traceOrder(
  payload: PayloadClient,
  user: AuthUser,
  body: Record<string, any>,
) {
  requireRole(user, ["ADMIN", "PROCUREMENT", "VIEWER"]);
  const orderId = requiredText(body.orderId, "Order ID");
  const order = await findOneByField(
    payload,
    "orders",
    "orderId",
    orderId,
    user,
  );
  if (!order) throw new ApiError("Không tìm thấy đơn hàng.", 404);
  const transactions = await payload.find({
    collection: "wms-transactions",
    where: { order: { equals: order.id } },
    depth: 1,
    limit: 100,
    sort: "date",
    user: user as never,
    overrideAccess: false,
  });
  return {
    order,
    trace: {
      factory: transactions.docs.filter(
        (item: any) => item.scope === "FACTORY",
      ),
      farm: transactions.docs.filter((item: any) => item.scope === "FARM"),
    },
  };
}

export async function orderMergeSuggestions(
  payload: PayloadClient,
  user: AuthUser,
) {
  requireRole(user, ["ADMIN", "PROCUREMENT"]);
  const orders = await payload.find({
    collection: "orders",
    limit: 1000,
    pagination: false,
    depth: 1,
    sort: "orderId",
    user: user as never,
    overrideAccess: false,
  });
  const groups = new Map<string, any[]>();
  orders.docs
    .filter((order: any) => order.status === "DRAFT" && !order.tmsOrderId)
    .forEach((order: any) => {
      const date = order.pickupDate
        ? new Date(order.pickupDate).toISOString().slice(0, 10)
        : "";
      const destination =
        order.destination?.name || String(order.destination || "");
      const key = `${destination}|${date}`;
      const rows = groups.get(key) || [];
      rows.push(order);
      groups.set(key, rows);
    });
  const suggestions: Array<Record<string, unknown>> = [];
  for (const rows of groups.values()) {
    let batch: any[] = [];
    let weight = 0;
    for (const order of rows) {
      const orderWeight =
        ((Number(order.quantity) || 0) *
          (Number(order.product?.uomWeightKg) || 40)) /
        1000;
      if (batch.length && weight + orderWeight > 8) {
        suggestions.push({
          destination: batch[0].destination?.name || batch[0].destination,
          pickupDate: batch[0].pickupDate,
          orderIds: batch.map((item) => item.orderId),
          totalWeightTon: weight,
        });
        batch = [];
        weight = 0;
      }
      batch.push(order);
      weight += orderWeight;
    }
    if (batch.length)
      suggestions.push({
        destination: batch[0].destination?.name || batch[0].destination,
        pickupDate: batch[0].pickupDate,
        orderIds: batch.map((item) => item.orderId),
        totalWeightTon: weight,
      });
  }
  return suggestions;
}

export async function mergeOrdersTms(
  payload: PayloadClient,
  user: AuthUser,
  body: Record<string, any>,
) {
  requireRole(user, ["ADMIN", "PROCUREMENT"]);
  const groups = body.orderIdGroups;
  if (!Array.isArray(groups) || !groups.length)
    throw new ApiError("orderIdGroups phải là mảng không rỗng.");
  const allIDs = groups
    .flat()
    .map((id: unknown) => requiredText(id, "Order ID"));
  if (new Set(allIDs).size !== allIDs.length)
    throw new ApiError(
      "Một Order không được xuất hiện nhiều lần trong yêu cầu.",
    );
  const result = await payload.find({
    collection: "orders",
    where: { orderId: { in: allIDs } },
    limit: allIDs.length,
    depth: 0,
    user: user as never,
    overrideAccess: false,
  });
  const byID = new Map(result.docs.map((order: any) => [order.orderId, order]));
  if (byID.size !== allIDs.length)
    throw new ApiError("Có Order không tồn tại.", 404);
  for (const orderID of allIDs) {
    const order: any = byID.get(orderID);
    if (order.status !== "DRAFT")
      throw new ApiError(`Order ${orderID} không ở trạng thái Bản nháp (DRAFT).`);
    if (order.tmsOrderId)
      throw new ApiError(`Order ${orderID} đã có TMS ${order.tmsOrderId}.`);
  }
  const orderRecordIds = new Map<string, string | number>(
    [...byID.entries()].map(([orderId, order]) => [orderId, order.id]),
  );
  return assignSequentialTmsIds(payload, user, groups, orderRecordIds);
}

export async function assignTmsUnfinished(
  payload: PayloadClient,
  user: AuthUser,
) {
  requireRole(user, ["ADMIN", "PROCUREMENT"]);
  const result = await payload.find({
    collection: "orders",
    where: {
      and: [
        { status: { not_equals: "COMPLETED" } },
        {
          or: [
            { tmsOrderId: { exists: false } },
            { tmsOrderId: { equals: "" } },
          ],
        },
      ],
    },
    limit: 1000,
    pagination: false,
    depth: 0,
    user: user as never,
    overrideAccess: false,
  });
  const orders = result.docs as any[];
  const groups = orders.map((order) => [
    requiredText(order.orderId, "Order ID"),
  ]);
  const orderRecordIds = new Map<string, string | number>(
    orders.map((order) => [requiredText(order.orderId, "Order ID"), order.id]),
  );
  return assignSequentialTmsIds(payload, user, groups, orderRecordIds);
}
