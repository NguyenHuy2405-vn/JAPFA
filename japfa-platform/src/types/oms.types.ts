// View-model returned by GET /api/japfa-data?tab=oms (see oms.query.service.ts on the backend).
// Both snake_case (legacy Apps Script naming) and camelCase keys are kept because the backend
// still emits both for backward compatibility with older UI code paths.
import type { OrderStatus } from "@/types/auth.types";

export type OmsOrderRow = {
  id: string | number;
  order_id: string;
  orderId: string;
  tenantId: string;
  create_date: string;
  createDate: string;
  client: string;
  ma_hang: string;
  sku: string;
  so_luong: number;
  quantity: number;
  uom: string;
  noi_i: string;
  origin: string;
  noi_en: string;
  destination: string;
  flockId: string;
  pickupDate: string;
  expectedDeliveryDate: string;
  status: OrderStatus;
  tmsOrderId: string;
  note: string;
};

export type OmsOrderFormValues = {
  tenant_id: string;
  client: string;
  ma_hang: string;
  so_luong: number;
  uom: string;
  noi_i: string;
  noi_en: string;
  flock_id: string;
  pickup_date: string;
  expected_delivery_date: string;
  status: string;
  note: string;
};

export type OmsMergeSuggestion = {
  destination: string;
  pickupDate: string;
  orderIds: string[];
  totalWeightTon: number;
};

export type OmsTraceResult = {
  order: OmsOrderRow;
  trace: {
    factory: any[];
    farm: any[];
  };
};
