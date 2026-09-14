/**
 * @deprecated Legacy hook for LegacyDashboardView.
 * Will be removed in Phase 11.
 */

import { useRef, useState } from "react";
import {
  adjustWmsInventory,
  createFarmOrder,
  createWmsTransaction,
  fetchWmsInventory,
  packageFarmOrder,
  suggestFarmOrder,
} from "@/services/api/wms.api";
import type {
  FarmOrderFormValues,
  FarmOrderSuggestData,
  WmsAdjustFormValues,
  WmsCurrentInfo,
  WmsTransactionRow,
  WmsTxnFormValues,
} from "@/types/wms.types";

type TenantOption = {
  id: number | string;
  tenantId: string;
  name: string;
  type?: string;
  system?: string;
  managedBy?: string;
};
type ProductOption = { id: number | string; sku: string; name: string };

export type UseWmsInventoryParams = {
  tenantOptions: TenantOption[];
  productOptions: ProductOption[];
  initialTenantFilter: string;
  initialFlockFilter: string;
  defaultTxnForm: WmsTxnFormValues;
  defaultAdjustForm: WmsAdjustFormValues;
  onError: (message: string) => void;
  onOrderCreated: () => void | Promise<void>;
};

const wmsScope = "farm" as const;

/**
 * Encapsulates every piece of state + network call belonging to the WMS tab:
 * inventory ledger list, manual inbound/outbound transaction modal, manual
 * adjustment modal, and the 3-step "Farm Order Wizard" that creates an OMS
 * order from a feed-stock forecast. 1:1 behavioral port from
 * DashboardClient.tsx.
 */
export function useWmsInventory({
  tenantOptions,
  productOptions,
  initialTenantFilter,
  initialFlockFilter,
  defaultTxnForm,
  defaultAdjustForm,
  onError,
  onOrderCreated,
}: UseWmsInventoryParams) {
  const [tenantFilter, setTenantFilter] = useState(initialTenantFilter);
  const [flockFilter, setFlockFilter] = useState(initialFlockFilter);
  const [rows, setRows] = useState<WmsTransactionRow[]>([]);
  const [currentInfo, setCurrentInfo] = useState<WmsCurrentInfo>(null);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);

  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnType, setTxnType] = useState<"Inbound" | "Outbound">("Inbound");
  const [txnForm, setTxnForm] = useState<WmsTxnFormValues>(defaultTxnForm);

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] =
    useState<WmsAdjustFormValues>(defaultAdjustForm);

  const [farmOrderStep, setFarmOrderStep] = useState<0 | 1 | 2 | 3>(0);
  const [farmOrderLoading, setFarmOrderLoading] = useState(false);
  const [farmOrderData, setFarmOrderData] =
    useState<FarmOrderSuggestData | null>(null);
  const [farmOrderForm, setFarmOrderForm] = useState<FarmOrderFormValues>({
    storage_days: "",
    packaging_sku: "",
    tenant_id: "",
    client: "",
    quantity: 0,
    uom: "Bag",
    origin: "",
    destination: "",
    expected_delivery_date: "",
    note: "",
  });

  const refetch = async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const json = await fetchWmsInventory({
        scope: wmsScope,
        tenantId: tenantFilter,
        flockId: flockFilter,
      });
      if (requestId !== requestRef.current) return;
      if (json.success) {
        setRows(json.data || []);
        setCurrentInfo(json.currentInfo || null);
      } else {
        onError(json.error || "Không thể tải lịch sử kho.");
      }
    } catch {
      if (requestId !== requestRef.current) return;
      onError("Không thể kết nối tới dịch vụ WMS.");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  };

  const changeTenantFilter = (value: string) => {
    setTenantFilter(value);
    setFlockFilter("");
  };

  const changeFlockFilter = (value: string) => {
    setFlockFilter(value);
  };

  const openTxnModal = (type: "Inbound" | "Outbound") => {
    if (!tenantFilter || !flockFilter) {
      onError("Vui lòng chọn Farm và Flock trước khi ghi giao dịch.");
      return;
    }
    const farm = tenantOptions.find(
      (tenant) => tenant.tenantId === tenantFilter,
    );
    const farmName = farm?.managedBy || farm?.name || "";
    const factory = tenantOptions.find((tenant) => tenant.type === "FACTORY");
    const factoryName = factory?.managedBy || factory?.name || "";
    const suggestedProduct = productOptions.find(
      (product) => product.name === currentInfo?.feedName,
    );
    setTxnType(type);
    setTxnForm({
      tenant_id: tenantFilter,
      flock_id: flockFilter,
      sku: suggestedProduct?.sku || productOptions[0]?.sku || "",
      so_luong: 50,
      from_location: type === "Inbound" ? factoryName : farmName,
      to_location: type === "Inbound" ? farmName : factoryName,
      note: "",
    });
    setShowTxnModal(true);
  };

  const submitTxnForm = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result = await createWmsTransaction(wmsScope, txnType, {
        ...txnForm,
        note: `From: ${txnForm.from_location} | To: ${txnForm.to_location}${txnForm.note ? ` | ${txnForm.note}` : ""}`,
      });
      if (result.success) {
        setShowTxnModal(false);
        await refetch();
      } else {
        onError((result as any).error || "Không thể ghi giao dịch kho.");
      }
    } catch {
      onError("Không thể kết nối khi ghi giao dịch kho.");
    }
  };

  const openAdjustModal = () => {
    if (!tenantFilter || !flockFilter) {
      onError("Vui lòng chọn Farm và Flock trước khi điều chỉnh.");
      return;
    }
    const suggestedProduct = productOptions.find(
      (product) => product.name === currentInfo?.feedName,
    );
    setAdjustForm({
      tenant_id: tenantFilter,
      flock_id: flockFilter,
      sku: suggestedProduct?.sku || productOptions[0]?.sku || "",
      delta: 0,
      reason: "Kiểm kê định kỳ",
      note: "",
    });
    setShowAdjustModal(true);
  };

  const submitAdjustForm = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await adjustWmsInventory(wmsScope, adjustForm);
    if (!result.success) {
      onError((result as any).error || "Không thể điều chỉnh tồn kho.");
      return;
    }
    setShowAdjustModal(false);
    await refetch();
  };

  const openFarmOrderWizard = () => {
    if (!tenantFilter || !flockFilter) {
      onError("Vui lòng chọn Farm và Flock trước khi tạo đơn hàng.");
      return;
    }
    onError("");
    setFarmOrderData(null);
    setFarmOrderForm((current) => ({ ...current, storage_days: "" }));
    setFarmOrderStep(1);
  };

  const closeFarmOrderWizard = () => setFarmOrderStep(0);

  const submitFarmOrderSuggest = async (
    event: React.FormEvent,
    lang: "vi" | "en",
    formatDate: (v: unknown, l: "vi" | "en") => string,
  ) => {
    event.preventDefault();
    setFarmOrderLoading(true);
    try {
      const response = await suggestFarmOrder(
        flockFilter,
        Number(farmOrderForm.storage_days || 0),
      );
      if (!response.success) throw new Error((response as any).error);
      const data = (response as any).data || {};
      if (data.isEnoughUntilRefDate || !(Number(data.suggestedQtyKg) > 0)) {
        setFarmOrderStep(0);
        onError(
          data.isEnoughUntilRefDate
            ? `Hàng vẫn đủ dùng đến ngày ${formatDate(data.referenceDate, lang)}.`
            : "Tồn kho dự kiến bằng 0 tại ngày tham chiếu, không có lượng đề xuất.",
        );
        return;
      }
      if (!data.packages?.length)
        throw new Error("Không có Packaging SKU phù hợp với loại thức ăn.");
      setFarmOrderData(data);
      setFarmOrderForm((current) => ({
        ...current,
        packaging_sku: data.packages[0].sku,
      }));
      setFarmOrderStep(2);
    } catch (error: any) {
      onError(error.message || "Không thể tính lượng đặt đề xuất.");
    } finally {
      setFarmOrderLoading(false);
    }
  };

  const submitFarmOrderPackage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!farmOrderData) return;
    setFarmOrderLoading(true);
    try {
      const response = await packageFarmOrder(
        farmOrderData.suggestedQtyKg,
        farmOrderForm.packaging_sku,
      );
      if (!response.success) throw new Error((response as any).error);
      const packageData = (response as any).data || {};
      const defaultFactory =
        farmOrderData.managedBy ||
        tenantOptions.find((tenant) => tenant.type === "FACTORY")?.name ||
        "";
      setFarmOrderData({ ...farmOrderData, packageData });
      setFarmOrderForm((current) => ({
        ...current,
        tenant_id: farmOrderData.tenantId,
        client: farmOrderData.farmName,
        quantity: packageData.suggestedBags,
        uom: packageData.uom || "Bag",
        origin: defaultFactory,
        destination: farmOrderData.farmName,
        expected_delivery_date: farmOrderData.referenceDate,
        note: `Auto order cho flock ${farmOrderData.flockName || flockFilter}`,
      }));
      setFarmOrderStep(3);
    } catch (error: any) {
      onError(error.message || "Không thể quy đổi số bao đề xuất.");
    } finally {
      setFarmOrderLoading(false);
    }
  };

  const submitCreateFarmOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    setFarmOrderLoading(true);
    try {
      const response = await createFarmOrder(flockFilter, farmOrderForm);
      if (!response.success) throw new Error((response as any).error);
      setFarmOrderStep(0);
      onError("");
      await onOrderCreated();
    } catch (error: any) {
      onError(error.message || "Không thể tạo đơn hàng cho Farm.");
    } finally {
      setFarmOrderLoading(false);
    }
  };

  return {
    tenantFilter,
    flockFilter,
    changeTenantFilter,
    changeFlockFilter,
    rows,
    currentInfo,
    loading,
    refetch,

    showTxnModal,
    setShowTxnModal,
    txnType,
    txnForm,
    setTxnForm,
    openTxnModal,
    submitTxnForm,

    showAdjustModal,
    setShowAdjustModal,
    adjustForm,
    setAdjustForm,
    openAdjustModal,
    submitAdjustForm,

    farmOrderStep,
    setFarmOrderStep,
    farmOrderLoading,
    farmOrderData,
    farmOrderForm,
    setFarmOrderForm,
    openFarmOrderWizard,
    closeFarmOrderWizard,
    submitFarmOrderSuggest,
    submitFarmOrderPackage,
    submitCreateFarmOrder,
  };
}
