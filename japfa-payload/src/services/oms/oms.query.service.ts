import type { PayloadClient } from "@/repositories/payload.repository";
import type { AuthUser } from "@/server/http/api-error";
import { normalizeTenantId } from "@/utils/tenant";

export type ListOrdersParams = {
  status: string;
  search: string;
};

const STATUS_ALIASES: Record<string, string> = {
  "Lên kế hoạch": "PLANNED",
  "Đã lấy hàng": "PICKED_UP",
  "Đã trừ kho": "PICKED_UP",
  "Chờ giao": "IN_TRANSIT",
  "Chờ giao hàng": "IN_TRANSIT",
  "Hoàn tất": "COMPLETED",
};

/** GET tab=oms — list + filter + view-model mapping for the OMS grid. */
export async function listOrders(
  payload: PayloadClient,
  user: AuthUser,
  { status, search }: ListOrdersParams,
) {
  const result = await payload.find({
    collection: "orders",
    limit: 200,
    depth: 1,
    sort: "-createdAt",
    user: user as never,
    overrideAccess: false,
  });
  const needle = search.toLowerCase();
  return result.docs
    .filter((order: any) => {
      const normalizedStatus = STATUS_ALIASES[status] || status;
      const statusMatch =
        !normalizedStatus ||
        normalizedStatus === "ALL" ||
        order.status === normalizedStatus;
      const searchMatch =
        !needle ||
        [
          order.orderId,
          order.client,
          order.product?.sku,
          order.product?.name,
          order.origin?.name,
          order.origin?.managedBy,
          order.destination?.name,
          order.destination?.managedBy,
          order.flock?.flockId,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(needle),
        );
      return statusMatch && searchMatch;
    })
    .map((order: any) => ({
      order_id: order.orderId,
      orderId: order.orderId,
      tenantId: order.tenant?.tenantId || normalizeTenantId(order.tenant) || "",
      create_date: order.createDate || order.createdAt,
      createDate: order.createDate || order.createdAt,
      client: order.client,
      ma_hang: order.product?.sku || order.product,
      sku: order.product?.sku || order.product,
      so_luong: order.quantity,
      quantity: order.quantity,
      uom: order.uom,
      noi_i:
        order.originDisplay ||
        order.origin?.managedBy ||
        order.origin?.name ||
        normalizeTenantId(order.origin?.tenantId || order.origin),
      origin:
        order.originDisplay ||
        order.origin?.managedBy ||
        order.origin?.name ||
        normalizeTenantId(order.origin?.tenantId || order.origin),
      noi_en:
        order.destinationDisplay ||
        order.destination?.managedBy ||
        order.destination?.name ||
        normalizeTenantId(order.destination?.tenantId || order.destination),
      destination:
        order.destinationDisplay ||
        order.destination?.managedBy ||
        order.destination?.name ||
        normalizeTenantId(order.destination?.tenantId || order.destination),
      flockId: order.flock?.flockId || order.flock || "",
      pickupDate: order.pickupDate || "",
      expectedDeliveryDate: order.expectedDeliveryDate || "",
      status: order.status,
      tmsOrderId: order.tmsOrderId || "",
      note: order.note,
      id: order.id,
    }));
}
