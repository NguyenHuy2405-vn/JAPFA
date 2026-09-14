import type {
  OmsMergeSuggestion,
  OmsOrderFormValues,
  OmsOrderRow,
  OmsTraceResult,
} from "@/types/oms.types";
import { getJson, postJson } from "@/services/api/http";

// API Client layer: the ONLY place in the frontend allowed to call `fetch` for
// OMS concerns. Components/hooks depend on this module instead of building
// request URLs/bodies themselves, so an API contract change only touches here.

type ApiResult<T> = { success: true; data?: T } & Record<string, unknown>;
type ApiError = { success: false; error: string };

async function postAction<
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<ApiResult<T> | ApiError> {
  return postJson("/api/japfa-data", {
    action,
    ...payload,
  }) as Promise<ApiResult<T> | ApiError>;
}

export async function fetchOrders(params: {
  status: string;
  search: string;
}): Promise<{ success: boolean; data?: OmsOrderRow[]; error?: string }> {
  const query = new URLSearchParams({
    tab: "oms",
    status: params.status,
    search: params.search,
  });
  return getJson(`/api/japfa-data?${query.toString()}`) as Promise<{
    success: boolean;
    data?: OmsOrderRow[];
    error?: string;
  }>;
}

export const createOrder = (form: OmsOrderFormValues) =>
  postAction<{ order: OmsOrderRow }>("create_order", form);

export const updateOrder = (orderId: string, form: OmsOrderFormValues) =>
  postAction<{ order: OmsOrderRow }>("update_order", { orderId, ...form });

export const updateOrderStatus = (orderId: string, status: string) =>
  postAction<{ order: OmsOrderRow }>("update_order_status", {
    orderId,
    status,
  });

export const traceOrder = (orderId: string) =>
  postAction<OmsTraceResult>("trace_order", { orderId });

export const fetchTmsMergeSuggestions = () =>
  postAction<{ suggestions: OmsMergeSuggestion[] }>("order_merge_suggestions");

export const mergeOrdersIntoTms = (orderIdGroups: string[][]) =>
  postAction("merge_orders_tms", { orderIdGroups });

export const assignTmsToUnfinishedOrders = () =>
  postAction("assign_tms_unfinished");
