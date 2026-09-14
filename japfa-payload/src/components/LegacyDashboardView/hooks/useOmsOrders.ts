/**
 * @deprecated Legacy hook for LegacyDashboardView.
 * Will be removed in Phase 11.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  assignTmsToUnfinishedOrders,
  createOrder,
  fetchOrders,
  fetchTmsMergeSuggestions,
  mergeOrdersIntoTms,
  traceOrder as traceOrderRequest,
  updateOrder,
  updateOrderStatus,
} from "@/services/api/oms.api";
import type {
  OmsMergeSuggestion,
  OmsOrderFormValues,
  OmsOrderRow,
  OmsTraceResult,
} from "@/types/oms.types";

export type UseOmsOrdersParams = {
  initialRows: OmsOrderRow[];
  defaultForm: OmsOrderFormValues;
  onError: (message: string) => void;
};

/**
 * Encapsulates every piece of state + every network call that belongs to the
 * OMS tab (list/filter, create/edit modal, trace modal, TMS merge flow).
 * This is a 1:1 behavioral port of the OMS logic that used to live inline in
 * DashboardClient.tsx — see the "before" version in the PR description.
 */
export function useOmsOrders({
  initialRows,
  defaultForm,
  onError,
}: UseOmsOrdersParams) {
  const router = useRouter();

  const [rows, setRows] = useState<OmsOrderRow[]>(initialRows);

  useEffect(() => {
    if (initialRows && initialRows.length > 0) setRows(initialRows);
  }, [initialRows]);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingOrderStatus, setEditingOrderStatus] = useState("PLANNED");
  const [form, setForm] = useState<OmsOrderFormValues>(defaultForm);

  const [showTraceModal, setShowTraceModal] = useState(false);
  const [traceResult, setTraceResult] = useState<
    (OmsTraceResult & { summary?: unknown }) | null
  >(null);

  const [showTmsSuggestionModal, setShowTmsSuggestionModal] = useState(false);
  const [tmsSuggestions, setTmsSuggestions] = useState<OmsMergeSuggestion[]>(
    [],
  );
  const [selectedTmsSuggestions, setSelectedTmsSuggestions] = useState<
    Record<number, boolean>
  >({});
  const [showTmsConfirmModal, setShowTmsConfirmModal] = useState(false);
  const [tmsConfirmMode, setTmsConfirmMode] = useState<"all" | "selected">(
    "all",
  );

  const requestRef = useRef(0);

  const refetch = async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const json = await fetchOrders({ status: statusFilter, search });
      if (requestId !== requestRef.current) return;
      if (json.success) {
        const nextRows = json.data || [];
        setRows(nextRows);
        const visibleIds = new Set(
          nextRows.map((row) => row.orderId || row.order_id),
        );
        setSelectedIds((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([id]) => visibleIds.has(id)),
          ),
        );
      } else {
        onError(json.error || "Không thể tải danh sách đơn hàng.");
      }
    } catch {
      if (requestId !== requestRef.current) return;
      onError("Không thể kết nối tới dịch vụ OMS.");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingOrderId(null);
    setForm(defaultForm);
    setShowCreateModal(true);
  };

  const openEditModal = (order: Partial<OmsOrderRow> & Record<string, any>) => {
    setEditingOrderId(order.orderId || order.order_id || null);
    setForm({
      tenant_id: order.tenantId || defaultForm.tenant_id,
      client: order.client || "",
      ma_hang: order.sku || order.ma_hang || defaultForm.ma_hang,
      so_luong: Number(order.quantity || order.so_luong || 0),
      uom: order.uom || "Bao",
      noi_i: order.origin || order.noi_i || "",
      noi_en: order.destination || order.noi_en || "",
      flock_id: order.flockId || order.flock_id || defaultForm.flock_id,
      pickup_date: order.pickupDate
        ? String(order.pickupDate).slice(0, 10)
        : "",
      expected_delivery_date: order.expectedDeliveryDate
        ? String(order.expectedDeliveryDate).slice(0, 10)
        : "",
      status: String(order.status || "PLANNED"),
      note: order.note || "",
    });
    setEditingOrderStatus(String(order.status || "PLANNED"));
    setShowCreateModal(true);
  };

  const submitOrderForm = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result = editingOrderId
        ? await updateOrder(editingOrderId, form)
        : await createOrder(form);
      if (!result.success) {
        onError((result as any).error || "Không thể tạo đơn hàng.");
        return;
      }
      if (editingOrderId && form.status !== editingOrderStatus) {
        const statusResult = await updateOrderStatus(
          editingOrderId,
          form.status,
        );
        if (!statusResult.success) throw new Error((statusResult as any).error);
        setShowCreateModal(false);
        setEditingOrderId(null);
        await refetch();
        router.refresh();
        return;
      }
      setShowCreateModal(false);
      setEditingOrderId(null);
      await refetch();
      setForm(defaultForm);
    } catch (err: any) {
      onError(err.message || "Không thể kết nối khi tạo đơn hàng.");
    }
  };

  const viewTrace = async (orderId: string, summary?: unknown) => {
    const result = await traceOrderRequest(orderId);
    if (!result.success) {
      onError((result as any).error || "Không thể tải truy vết đơn hàng.");
      return;
    }
    setTraceResult({
      ...(result as any),
      summary: summary ?? (result as any).order,
    });
    setShowTraceModal(true);
  };

  const toggleSelection = (orderId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = { ...current };
      if (checked) next[orderId] = true;
      else delete next[orderId];
      return next;
    });
  };

  const requestAssignTmsUnfinished = () => {
    setTmsConfirmMode("all");
    setShowTmsConfirmModal(true);
  };

  const confirmAssignTmsUnfinished = async () => {
    setShowTmsConfirmModal(false);
    const result = await assignTmsToUnfinishedOrders();
    if (!result.success) onError((result as any).error || "Không thể tạo TMS.");
    else await refetch();
  };

  const suggestTmsMerge = async () => {
    const result = await fetchTmsMergeSuggestions();
    if (!result.success) {
      onError((result as any).error || "Không thể tải gợi ý ghép TMS.");
      return;
    }
    const suggestions = (result as any).suggestions || [];
    setTmsSuggestions(suggestions);
    setSelectedTmsSuggestions(
      Object.fromEntries(
        suggestions.map((_: unknown, index: number) => [index, true]),
      ),
    );
    setShowTmsSuggestionModal(true);
  };

  const createSuggestedTms = async () => {
    const groups = tmsSuggestions
      .filter((_, index) => selectedTmsSuggestions[index])
      .map((suggestion) => suggestion.orderIds);
    if (!groups.length) {
      onError("Vui lòng chọn ít nhất một nhóm gợi ý.");
      return;
    }
    const result = await mergeOrdersIntoTms(groups);
    if (!result.success) {
      onError((result as any).error || "Không thể tạo TMS từ nhóm gợi ý.");
      return;
    }
    setShowTmsSuggestionModal(false);
    setSelectedIds({});
    await refetch();
  };

  const requestMergeSelectedTms = () => {
    if (!Object.keys(selectedIds).length) {
      onError("Vui lòng chọn ít nhất một đơn để ghép TMS.");
      return;
    }
    setTmsConfirmMode("selected");
    setShowTmsConfirmModal(true);
  };

  const confirmMergeSelectedTms = async () => {
    const orderIds = Object.keys(selectedIds);
    setShowTmsConfirmModal(false);
    const result = await mergeOrdersIntoTms([orderIds]);
    if (!result.success) {
      onError((result as any).error || "Không thể ghép đơn thành TMS.");
      return;
    }
    setSelectedIds({});
    await refetch();
  };

  return {
    rows,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    loading,
    selectedIds,
    toggleSelection,
    clearSelection: () => setSelectedIds({}),
    refetch,

    showCreateModal,
    setShowCreateModal,
    openCreateModal,
    openEditModal,
    editingOrderId,
    form,
    setForm,
    submitOrderForm,

    showTraceModal,
    setShowTraceModal,
    traceResult,
    viewTrace,

    showTmsSuggestionModal,
    setShowTmsSuggestionModal,
    tmsSuggestions,
    selectedTmsSuggestions,
    setSelectedTmsSuggestions,
    showTmsConfirmModal,
    setShowTmsConfirmModal,
    tmsConfirmMode,
    requestAssignTmsUnfinished,
    confirmAssignTmsUnfinished,
    suggestTmsMerge,
    createSuggestedTms,
    requestMergeSelectedTms,
    confirmMergeSelectedTms,
  };
}
