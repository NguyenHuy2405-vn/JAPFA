/**
 * @deprecated Legacy hook for LegacyDashboardView.
 * Will be removed in Phase 11.
 */

import { useState } from "react";
import { fetchSetupSection, upsertSetup } from "@/services/api/setup.api";
import {
  BLOCK_SYSTEM_OPTIONS,
  computeAccountFilters,
  isFactoryRow,
  type AccountBlock,
  type AccountRow,
} from "@/utils/setupAccountFilters";
import type { SetupPolicyForm, SetupProductForm } from "@/types/setup.types";
import type { SetupSubTab } from "@/components/LegacyDashboardView/tabs/SetupTab";

export type SetupAccountForm = {
  block: AccountBlock;
  system: string;
  tenant: string;
  tenant_id: string;
  managed_by: string;
  address_of_tenant: string;
  farm_tenant_id: string;
  source_group: string;
  flock_id: string;
  flock_name: string;
  standards_applied: string[];
  start_flock_count: string;
  start_flock_date: string;
};

export type UseSetupDataParams = {
  pageSize: number;
  onError: (message: string) => void;
  t: (key: any, lang: "vi" | "en") => string;
  lang: "vi" | "en";
};

const buildDefaultAccountForm = (block: AccountBlock): SetupAccountForm => {
  const system = BLOCK_SYSTEM_OPTIONS[block][0];
  const tenant = block === "factory" ? `${system}_0` : "";
  return {
    block,
    system,
    tenant,
    tenant_id: tenant,
    managed_by: "",
    address_of_tenant: "",
    farm_tenant_id: "",
    source_group: "",
    flock_id: "",
    flock_name: "",
    standards_applied: [],
    start_flock_count: "",
    start_flock_date: "",
  };
};

/** Encapsulates state + network calls for the Setup tab (account/product/feed-standard/policy master data). */
export function useSetupData({
  pageSize,
  onError,
  t,
  lang,
}: UseSetupDataParams) {
  const [accountRawRows, setAccountRawRows] = useState<AccountRow[]>([]);
  const [feedRawRows, setFeedRawRows] = useState<any[]>([]);
  const [productRows, setProductRows] = useState<any[]>([]);
  const [policyRows, setPolicyRows] = useState<any[]>([]);
  const [chickenTypeOptions, setChickenTypeOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [accountPage, setAccountPage] = useState(1);
  const [feedPage, setFeedPage] = useState(1);
  const [policySearch, setPolicySearch] = useState("");

  const [block, setBlock] = useState<AccountBlock>("factory");
  const [system, setSystem] = useState("");
  const [tenant, setTenant] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [address, setAddress] = useState("");
  const [flockId, setFlockId] = useState("");
  const [flockName, setFlockName] = useState("");

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountEditing, setAccountEditing] = useState(false);
  const [accountForm, setAccountForm] = useState<SetupAccountForm>(() =>
    buildDefaultAccountForm("factory"),
  );

  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState<SetupProductForm>({
    sku: "",
    ten_hang_hoa: "",
    loai_san_pham: "Chicken_feed",
    uom: "Bag",
    uom_weight_kg: 40,
    status: "ACTIVE",
  });

  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyForm, setPolicyForm] = useState<SetupPolicyForm>({
    ma_hang: "",
    zero_threshold: 1,
    critical_threshold: 1.5,
    low_threshold: 3,
    high_threshold: 10,
    status: "active",
    note: "",
  });

  const [chicken, setChicken] = useState("");
  const [feedType, setFeedType] = useState("");
  const [age, setAge] = useState("");

  // Mirrors the legacy Config sheet's grouping label (e.g. "WMS_1" -> "FLOCK_1").
  const deriveFlockGroup = (farmTenantId: string) => {
    const match = farmTenantId.match(/(\d+)$/);
    return match ? `FLOCK_${match[1]}` : "";
  };

  // Legacy Config sheet's per-flock Tenant_id (e.g. "FLOCK_11") is the group
  // label plus a 1-based sequence within that group; preview the next one.
  const nextFlockTenantId = (group: string) => {
    if (!group) return "";
    const count = accountRawRows.filter(
      (row) => row._kind === "flock" && row.tenant === group,
    ).length;
    return `${group}${count + 1}`;
  };

  const refetch = async (subTab: SetupSubTab) => {
    onError("");
    setLoading(true);
    try {
      if (subTab === "account") {
        // Cascading <select> filters are computed client-side, so fetch the
        // full unfiltered dataset once per reload instead of round-tripping
        // per filter change.
        const [accountJson, feedJson] = await Promise.all([
          fetchSetupSection("account"),
          fetchSetupSection("standard"),
        ]);
        if (accountJson.success) {
          setAccountRawRows(accountJson.data || []);
          setAccountPage(1);
        } else {
          onError(accountJson.error || "Không thể tải dữ liệu cấu hình.");
        }
        if (feedJson.success) {
          setFeedRawRows(feedJson.data || []);
          const types = Array.from(
            new Set(
              (feedJson.data || [])
                .map((row: any) => String(row.loai_ga || "").trim())
                .filter(Boolean),
            ),
          ) as string[];
          setChickenTypeOptions(types.sort());
        }
        return;
      }

      if (subTab === "standard") {
        const json = await fetchSetupSection("standard");
        if (json.success) {
          setFeedRawRows(json.data || []);
          setFeedPage(1);
          const types = Array.from(
            new Set(
              (json.data || [])
                .map((row: any) => String(row.loai_ga || "").trim())
                .filter(Boolean),
            ),
          ) as string[];
          setChickenTypeOptions(types.sort());
        } else {
          onError(json.error || "Không thể tải dữ liệu định mức thức ăn.");
        }
        return;
      }

      if (subTab === "feed") {
        const [productJson, policyJson] = await Promise.all([
          fetchSetupSection("product"),
          fetchSetupSection("policy"),
        ]);
        if (productJson.success) {
          setProductRows(productJson.data || []);
        } else {
          onError(productJson.error || "Không thể tải danh mục sản phẩm.");
        }
        if (policyJson.success) {
          setPolicyRows(policyJson.data || []);
        } else {
          onError(policyJson.error || "Không thể tải ngưỡng cảnh báo.");
        }
        return;
      }
    } catch {
      onError("Không thể kết nối tới dịch vụ cấu hình.");
    } finally {
      setLoading(false);
    }
  };

  const submitProductForm = async (
    event: React.FormEvent,
    refetchSubTab: SetupSubTab,
  ) => {
    event.preventDefault();
    try {
      const generatedSku =
        productForm.sku.trim() ||
        `${productForm.ten_hang_hoa}_${productForm.uom}_${productForm.uom_weight_kg}`;
      const result = await upsertSetup(
        "product",
        { ...productForm, sku: generatedSku },
        true,
      );
      if (!result.success) {
        onError((result as any).error || "Không thể tạo sản phẩm.");
        return;
      }
      setShowProductModal(false);
      setProductForm({
        sku: "",
        ten_hang_hoa: "",
        loai_san_pham: "Chicken_feed",
        uom: "Bag",
        uom_weight_kg: 40,
        status: "ACTIVE",
      });
      await refetch(refetchSubTab);
    } catch {
      onError("Lỗi khi tạo sản phẩm.");
    }
  };

  const submitPolicyForm = async (
    event: React.FormEvent,
    refetchSubTab: SetupSubTab,
  ) => {
    event.preventDefault();
    try {
      const result = await upsertSetup("policy", policyForm, true);
      if (!result.success) {
        onError((result as any).error || "Không thể tạo ngưỡng cảnh báo.");
        return;
      }
      setShowPolicyModal(false);
      setPolicyForm({
        ma_hang: "",
        zero_threshold: 1,
        critical_threshold: 1.5,
        low_threshold: 3,
        high_threshold: 10,
        status: "active",
        note: "",
      });
      await refetch(refetchSubTab);
    } catch {
      onError("Lỗi khi tạo ngưỡng cảnh báo.");
    }
  };

  const savePolicyInline = async (
    sku: string,
    zero: number,
    critical: number,
    low: number,
    high: number,
    status: string,
    note: string,
  ) => {
    try {
      const result = await upsertSetup(
        "policy",
        {
          ma_hang: sku,
          zero_threshold: zero,
          critical_threshold: critical,
          low_threshold: low,
          high_threshold: high,
          status,
          note,
        },
        true,
      );
      if (!result.success) {
        onError((result as any).error || t("toastPolicyQuickFailed", lang));
        return;
      }
      setPolicyRows((prev) =>
        prev.map((r) => (r.ma_hang === sku ? { ...r, status, note } : r)),
      );
    } catch {
      onError(t("toastPolicyQuickFailed", lang));
    }
  };

  const createAccount = async (
    event: React.FormEvent,
    refetchSubTab: SetupSubTab,
  ) => {
    event.preventDefault();
    const form = accountForm;
    const payload: Record<string, unknown> =
      form.block === "flock"
        ? {
            block: "flock",
            farm_tenant_id: form.farm_tenant_id,
            source_group: form.source_group,
            flock_id: form.flock_id,
            flock_name: form.flock_name,
            standards_applied: form.standards_applied.join(", "),
            start_flock_count: form.start_flock_count
              ? Number(form.start_flock_count)
              : null,
            start_flock_date: form.start_flock_date || null,
          }
        : {
            block: form.block,
            system: form.system,
            tenant: form.tenant,
            tenant_id: form.tenant_id,
            managed_by: form.managed_by,
            address_of_tenant: form.address_of_tenant,
          };
    const result = await upsertSetup("account", payload, accountEditing);
    if (!result.success) {
      onError((result as any).error || "Không thể thêm tài khoản.");
      return;
    }
    setShowAccountModal(false);
    setAccountEditing(false);
    setAccountForm(buildDefaultAccountForm(block));
    await refetch(refetchSubTab);
  };

  const editAccount = (row: AccountRow) => {
    if (row._kind === "flock") {
      setAccountForm({
        block: "flock",
        system: "FMS",
        tenant: "",
        tenant_id: row.tenant_id,
        managed_by: row.managed_by,
        address_of_tenant: row.address_of_tenant,
        farm_tenant_id: row._farmTenantId || "",
        source_group: row._sourceGroup || "",
        flock_id: row.flock_id,
        flock_name: row.flock_name,
        standards_applied: String(row.standards_applied || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        start_flock_count: String(row.start_flock_count ?? ""),
        start_flock_date: row.start_flock_date
          ? String(row.start_flock_date).slice(0, 10)
          : "",
      });
    } else {
      const nextBlock: AccountBlock =
        String(row.system).toUpperCase() === "TMS"
          ? "transport"
          : isFactoryRow(row)
            ? "factory"
            : "farm";
      setAccountForm({
        ...buildDefaultAccountForm(nextBlock),
        system: row.system,
        tenant: row.tenant,
        tenant_id: row.tenant_id,
        managed_by: row.managed_by,
        address_of_tenant: row.address_of_tenant,
      });
    }
    setAccountEditing(true);
    setShowAccountModal(true);
  };

  const openCreateAccountModal = () => {
    setAccountEditing(false);
    setAccountForm(buildDefaultAccountForm(block));
    setShowAccountModal(true);
  };

  const changeBlock = (value: AccountBlock) => {
    setBlock(value);
    setAccountPage(1);
  };

  const changeChicken = (value: string) => {
    setChicken(value);
    setFeedPage(1);
  };

  const changeFeedType = (value: string) => {
    setFeedType(value);
    setFeedPage(1);
  };

  const changeAge = (value: string) => {
    setAge(value);
    setFeedPage(1);
  };

  const getPagedData = (rows: any[], page: number) => {
    const total = rows.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    return {
      slice: rows.slice(start, end),
      total,
      totalPages,
      start: total > 0 ? start + 1 : 0,
      end,
    };
  };

  const accountFilterResult = computeAccountFilters(accountRawRows, {
    block,
    system,
    tenant,
    tenantId,
    address,
    flockId,
    flockName,
  });
  const pagedAccount = getPagedData(accountFilterResult.rows, accountPage);

  const chickenOptions = Array.from(
    new Set(
      feedRawRows.map((r) => String(r.loai_ga || "").trim()).filter(Boolean),
    ),
  ).sort();
  const feedTypeOptions = Array.from(
    new Set(
      feedRawRows.map((r) => String(r.loai_cam || "").trim()).filter(Boolean),
    ),
  ).sort();

  const filteredFeedRows = feedRawRows
    .filter((r) => !chicken || String(r.loai_ga || "").trim() === chicken)
    .filter((r) => !feedType || String(r.loai_cam || "").trim() === feedType)
    .filter((r) => {
      if (age.trim() === "") return true;
      const ageNum = Number(age);
      return !isNaN(ageNum) && Number(r.ngay_tuoi) === ageNum;
    })
    .sort((a, b) => {
      const chickenCmp = String(a.loai_ga || "").localeCompare(
        String(b.loai_ga || ""),
      );
      if (chickenCmp !== 0) return chickenCmp;
      return Number(a.ngay_tuoi || 0) - Number(b.ngay_tuoi || 0);
    });
  const pagedFeed = getPagedData(filteredFeedRows, feedPage);

  const filteredPolicyRows = policySearch.trim()
    ? policyRows.filter((r) =>
        [r.ma_hang, r.status, r.note]
          .join(" ")
          .toLowerCase()
          .includes(policySearch.trim().toLowerCase()),
      )
    : policyRows;

  const farmTenantRowsForFlockForm = accountRawRows.filter(
    (row) =>
      row._kind === "tenant" &&
      String(row.system).toUpperCase() === "WMS" &&
      !isFactoryRow(row),
  );

  return {
    loading,
    refetch,

    accountFilter: accountFilterResult,
    accountRows: pagedAccount.slice,
    accountPage,
    accountTotal: pagedAccount.total,
    accountTotalPages: pagedAccount.totalPages,
    setAccountPage,
    block,
    changeBlock,
    system,
    setSystem,
    tenant,
    setTenant,
    tenantId,
    setTenantId,
    address,
    setAddress,
    flockId,
    setFlockId,
    flockName,
    setFlockName,

    showAccountModal,
    setShowAccountModal,
    accountEditing,
    setAccountEditing,
    accountForm,
    setAccountForm,
    buildDefaultAccountForm,
    deriveFlockGroup,
    nextFlockTenantId,
    openCreateAccountModal,
    editAccount,
    createAccount,
    farmTenantRowsForFlockForm,
    chickenTypeOptions,

    chicken,
    changeChicken,
    feedType,
    changeFeedType,
    age,
    changeAge,
    chickenOptions,
    feedTypeOptions,
    feedRows: pagedFeed.slice,
    feedPage,
    feedTotal: pagedFeed.total,
    feedTotalPages: pagedFeed.totalPages,
    setFeedPage,

    productRows,
    showProductModal,
    setShowProductModal,
    productForm,
    setProductForm,
    submitProductForm,

    policyRows: filteredPolicyRows,
    policySearch,
    setPolicySearch,
    showPolicyModal,
    setShowPolicyModal,
    policyForm,
    setPolicyForm,
    submitPolicyForm,
    savePolicyInline,
  };
}
