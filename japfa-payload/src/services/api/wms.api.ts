import type {
  FarmOrderFormValues,
  WmsAdjustFormValues,
  WmsCurrentInfo,
  WmsScope,
  WmsTransactionRow,
  WmsTxnFormValues,
} from "@/types/wms.types";
import { getJson, postJson } from "@/services/api/http";

async function postAction(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<{ success: boolean; error?: string } & Record<string, unknown>> {
  return postJson("/api/japfa-data", {
    action,
    ...payload,
  }) as Promise<{ success: boolean; error?: string } & Record<string, unknown>>;
}

export async function fetchWmsInventory(params: {
  scope: WmsScope;
  tenantId: string;
  flockId: string;
}): Promise<{
  success: boolean;
  data?: WmsTransactionRow[];
  currentInfo?: WmsCurrentInfo;
  error?: string;
}> {
  const query = new URLSearchParams({
    tab: "wms",
    scope: params.scope,
    tenantId: params.tenantId,
    flockId: params.flockId,
  });
  return getJson(`/api/japfa-data?${query.toString()}`) as Promise<{
    success: boolean;
    data?: WmsTransactionRow[];
    currentInfo?: WmsCurrentInfo;
    error?: string;
  }>;
}

export const createWmsTransaction = (
  scope: WmsScope,
  txnType: "Inbound" | "Outbound",
  form: WmsTxnFormValues,
) => postAction("create_wms_txn", { scope, loai_giao_dich: txnType, ...form });

export const adjustWmsInventory = (
  scope: WmsScope,
  form: WmsAdjustFormValues,
) => postAction("adjust_wms", { scope, ...form });

export const suggestFarmOrder = (flockId: string, storageDays: number) =>
  postAction("farm_order_suggest", {
    flock_id: flockId,
    storage_days: storageDays,
  });

export const packageFarmOrder = (
  suggestedQtyKg: number,
  packagingSku: string,
) =>
  postAction("farm_order_package", {
    suggested_qty_kg: suggestedQtyKg,
    packaging_sku: packagingSku,
  });

export const createFarmOrder = (
  flockId: string,
  form: Pick<
    FarmOrderFormValues,
    | "tenant_id"
    | "client"
    | "packaging_sku"
    | "quantity"
    | "uom"
    | "origin"
    | "destination"
    | "expected_delivery_date"
    | "note"
  >,
) =>
  postAction("create_order", {
    tenant_id: form.tenant_id,
    client: form.client,
    ma_hang: form.packaging_sku,
    so_luong: form.quantity,
    uom: form.uom,
    noi_i: form.origin,
    noi_en: form.destination,
    flock_id: flockId,
    expected_delivery_date: form.expected_delivery_date,
    note: form.note,
  });
