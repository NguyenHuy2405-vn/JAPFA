/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

import React, { useEffect, useState } from "react";
import { t } from "@/utils/i18n";
import { DashboardTab } from "./tabs/DashboardTab";
import { FmsTab } from "./tabs/FmsTab";
import { SetupTab, type SetupSubTab } from "./tabs/SetupTab";
import { OmsTab } from "./tabs/OmsTab";
import { WmsTab } from "./tabs/WmsTab";
import { SetupAccountModal } from "./modals/SetupAccountModal";
import { SetupProductModal } from "./modals/SetupProductModal";
import { SetupPolicyModal } from "./modals/SetupPolicyModal";
import { CreateOrderModal } from "./modals/CreateOrderModal";
import { FarmOrderWizardModal } from "./modals/FarmOrderWizardModal";
import { WmsTransactionModal } from "./modals/WmsTransactionModal";
import { OrderTraceModal } from "./modals/OrderTraceModal";
import { TmsSuggestionModal } from "./modals/TmsSuggestionModal";
import { TmsConfirmModal } from "./modals/TmsConfirmModal";
import { WmsAdjustModal } from "./modals/WmsAdjustModal";
import { FmsMortModal } from "./modals/FmsMortModal";
import { useOmsOrders } from "./hooks/useOmsOrders";
import { useWmsInventory } from "./hooks/useWmsInventory";
import { useFmsLog } from "./hooks/useFmsLog";
import { useSetupData } from "./hooks/useSetupData";
import { normalizeTenantId } from "@/utils/tenant";

interface AlertItem {
  id: string;
  date: string;
  tenantId: string;
  farmName?: string;
  flockId: string;
  feedName: string;
  status: string;
  currentDay: number;
}

interface DashboardClientProps {
  userRole?: string;
  userEmail?: string;
  tenantOptions?: Array<{
    id: number | string;
    tenantId: string;
    name: string;
    type?: string;
    system?: string;
    managedBy?: string;
  }>;
  productOptions?: Array<{ id: number | string; sku: string; name: string }>;
  flockOptions?: Array<{
    id: number | string;
    flockId: string;
    name?: string;
    tenantId?: string;
  }>;
  orderCounts: Record<string, number>;
  totalOrders: number;
  fmsAlertCount: number;
  factorySkuCount: number;
  farmSkuCount: number;
  fmsAlerts: AlertItem[];
  recentFactoryTxns: any[];
  recentFarmTxns: any[];
  flocksList?: string[];
  omsOrdersList?: any[];
  factoryInventoryList?: any[];
  farmInventoryList?: any[];
}

const formatDate = (value: unknown, lang: "vi" | "en" = "vi") => {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const FMS_PAGE_SIZE = 20;
const SETUP_PAGE_SIZE = 15;

const getPagedData = (rows: any[], page: number, pageSize: number) => {
  const total = rows.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const slice = rows.slice(start, end);
  return { slice, total, totalPages, start: total > 0 ? start + 1 : 0, end };
};

export function DashboardClient({
  userRole = "VIEWER",
  tenantOptions = [],
  productOptions = [],
  flockOptions = [],
  orderCounts: initialOrderCounts,
  totalOrders: initialTotalOrders,
  fmsAlertCount,
  factorySkuCount,
  farmSkuCount,
  fmsAlerts: initialFmsAlerts,
  recentFactoryTxns = [],
  flocksList = [],
  omsOrdersList = [],
  factoryInventoryList = [],
}: DashboardClientProps) {
  const operationalTenants = tenantOptions.filter(
    (tenant) =>
      tenant.type === "FARM" ||
      tenant.type === "FACTORY" ||
      tenant.tenantId.startsWith("WMS_"),
  );
  const firstOperationalTenantId =
    operationalTenants.find((tenant) => tenant.type === "FARM")?.tenantId ||
    operationalTenants[0]?.tenantId ||
    "";
  const [lang, setLang] = useState<"vi" | "en">("vi");
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "oms" | "wms" | "fms" | "setup"
  >("dashboard");
  const [setupSubTab, setSetupSubTab] = useState<SetupSubTab>("account");
  const [actionError, setActionError] = useState<string>("");

  // Farm Filter for FMS Alert Table (Apps Script dashboardAlertFarmFilter)
  const defaultFarm = flocksList[0] || "";
  const [selectedFarmFilter, setSelectedFarmFilter] =
    useState<string>(defaultFarm);

  useEffect(() => {
    const applyStoredLanguage = () => {
      const saved = window.localStorage.getItem("japfa.lang");
      if (saved === "vi" || saved === "en") {
        setLang(saved);
      }
    };

    applyStoredLanguage();

    const onLanguageChanged = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail === "vi" || detail === "en") {
        setLang(detail);
      }
    };

    window.addEventListener("app-language-change", onLanguageChanged);
    window.addEventListener("storage", applyStoredLanguage);
    return () => {
      window.removeEventListener("app-language-change", onLanguageChanged);
      window.removeEventListener("storage", applyStoredLanguage);
    };
  }, []);

  useEffect(() => {
    if (
      flocksList.length > 0 &&
      selectedFarmFilter &&
      !flocksList.includes(selectedFarmFilter)
    ) {
      setSelectedFarmFilter("");
    }
  }, [flocksList, selectedFarmFilter]);

  const canCreateOrder = userRole === "ADMIN" || userRole === "PROCUREMENT";
  const canWriteWms =
    userRole === "ADMIN" || userRole === "INVENTORY" || userRole === "OPS";
  const canWriteFms =
    userRole === "ADMIN" || userRole === "TECHNICAL" || userRole === "OPS";

  const oms = useOmsOrders({
    initialRows: omsOrdersList,
    defaultForm: {
      tenant_id: firstOperationalTenantId,
      client: "",
      ma_hang: productOptions[0]?.sku || "",
      so_luong: 100,
      uom: "Bao",
      noi_i:
        tenantOptions.find((tenant) => tenant.type === "FACTORY")?.name || "",
      noi_en:
        tenantOptions.find((tenant) => tenant.type === "FARM")?.name || "",
      flock_id: flockOptions[0]?.flockId || "",
      pickup_date: "",
      expected_delivery_date: "",
      status: "PLANNED",
      note: "",
    },
    onError: setActionError,
  });

  const wmsFacilityOptions = tenantOptions
    .filter(
      (tenant) =>
        tenant.type === "FARM" &&
        (tenant.system === "WMS" || tenant.tenantId.startsWith("WMS_")),
    )
    .sort((left, right) =>
      left.tenantId.localeCompare(right.tenantId, undefined, { numeric: true }),
    );
  const firstWmsFarm =
    wmsFacilityOptions.find(
      (tenant) => normalizeTenantId(tenant.tenantId).toUpperCase() === "WMS_1",
    ) || wmsFacilityOptions[0];
  const firstFarmFlock = flockOptions.find(
    (flock) => flock.tenantId === firstWmsFarm?.tenantId,
  );

  const wms = useWmsInventory({
    tenantOptions,
    productOptions,
    initialTenantFilter: firstWmsFarm?.tenantId || "",
    initialFlockFilter: firstFarmFlock?.flockId || "",
    defaultTxnForm: {
      tenant_id: firstOperationalTenantId,
      sku: productOptions[0]?.sku || "",
      flock_id: flockOptions[0]?.flockId || "",
      so_luong: 50,
      from_location: "",
      to_location: "",
      note: "",
    },
    defaultAdjustForm: {
      tenant_id: firstOperationalTenantId,
      sku: productOptions[0]?.sku || "",
      flock_id: flockOptions[0]?.flockId || "",
      delta: 0,
      reason: "Kiểm kê định kỳ",
      note: "",
    },
    onError: setActionError,
    onOrderCreated: oms.refetch,
  });

  const fms = useFmsLog({ pageSize: FMS_PAGE_SIZE, onError: setActionError });
  const setup = useSetupData({
    pageSize: SETUP_PAGE_SIZE,
    onError: setActionError,
    t,
    lang,
  });

  // Fetch OMS data
  useEffect(() => {
    if (activeTab === "oms") oms.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, oms.statusFilter]);

  // Fetch WMS data
  useEffect(() => {
    if (activeTab === "wms") wms.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, wms.tenantFilter, wms.flockFilter]);

  // Fetch FMS data
  useEffect(() => {
    if (activeTab === "fms" && fms.flockFilter) fms.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fms.tenantFilter, fms.flockFilter]);

  // Fetch Setup data
  useEffect(() => {
    if (activeTab === "setup") setup.refetch(setupSubTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, setupSubTab]);

  const getStatusBadge = (status: string) => {
    switch (String(status).toUpperCase()) {
      case "ZERO":
        return <span className="badge badge-zero">{t("badgeZero", lang)}</span>;
      case "CRITICAL":
        return (
          <span className="badge badge-critical">
            {t("badgeCritical", lang)}
          </span>
        );
      case "LOW":
        return <span className="badge badge-low">{t("badgeLow", lang)}</span>;
      default:
        return <span className="badge badge-safe">{t("badgeSafe", lang)}</span>;
    }
  };

  const farmTenantOptions = tenantOptions
    .filter(
      (tenant) =>
        tenant.type === "FARM" &&
        (tenant.system === "WMS" || tenant.tenantId.startsWith("WMS_")),
    )
    .sort((left, right) =>
      left.tenantId.localeCompare(right.tenantId, undefined, { numeric: true }),
    );
  const visibleFlockOptions = flockOptions.filter(
    (flock) => !wms.tenantFilter || flock.tenantId === wms.tenantFilter,
  );
  const selectedOrderDestination = tenantOptions.find(
    (tenant) => (tenant.managedBy || tenant.name) === oms.form.noi_en,
  );
  const orderLocationOptions = Array.from(
    new Map(
      operationalTenants
        .map((tenant) => [tenant.managedBy || tenant.name, tenant] as const)
        .filter(([name]) => Boolean(name)),
    ).values(),
  );
  const wmsLocationOptions = Array.from(
    new Map(
      operationalTenants
        .filter((tenant) => tenant.system === "WMS")
        .map((tenant) => [tenant.managedBy || tenant.name, tenant] as const)
        .filter(([name]) => Boolean(name)),
    ).values(),
  );
  const orderFlockOptions = flockOptions.filter(
    (flock) =>
      !selectedOrderDestination ||
      flock.tenantId === selectedOrderDestination.tenantId,
  );
  const pagedFms = getPagedData(fms.rows, fms.page, FMS_PAGE_SIZE);

  return (
    <div className="japfa-dashboard">
      <div className="flex flex-wrap gap-2 rounded-md border border-line bg-surface p-2 shadow-card">
        <button
          type="button"
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            activeTab === "dashboard"
              ? "bg-primary text-white"
              : "text-ink-soft hover:bg-background-soft hover:text-ink"
          }`}
          onClick={() => setActiveTab("dashboard")}
        >
          {t("navDashboard", lang)}
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            activeTab === "oms"
              ? "bg-primary text-white"
              : "text-ink-soft hover:bg-background-soft hover:text-ink"
          }`}
          onClick={() => setActiveTab("oms")}
        >
          {t("navOms", lang)}
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            activeTab === "wms"
              ? "bg-primary text-white"
              : "text-ink-soft hover:bg-background-soft hover:text-ink"
          }`}
          onClick={() => setActiveTab("wms")}
        >
          {t("navWms", lang)}
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            activeTab === "fms"
              ? "bg-primary text-white"
              : "text-ink-soft hover:bg-background-soft hover:text-ink"
          }`}
          onClick={() => setActiveTab("fms")}
        >
          {t("navFms", lang)}
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            activeTab === "setup"
              ? "bg-primary text-white"
              : "text-ink-soft hover:bg-background-soft hover:text-ink"
          }`}
          onClick={() => setActiveTab("setup")}
        >
          {t("navSetup", lang)}
        </button>
      </div>

      {actionError && (
        <div className="dashboard-error" role="alert">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError("")}>
            Đóng
          </button>
        </div>
      )}

      {/* VIEW 1: DASHBOARD OVERVIEW */}
      {activeTab === "dashboard" && (
        <DashboardTab
          lang={lang}
          orderCounts={initialOrderCounts}
          totalOrders={initialTotalOrders}
          fmsAlertCount={fmsAlertCount}
          factorySkuCount={factorySkuCount}
          farmSkuCount={farmSkuCount}
          alerts={initialFmsAlerts}
          flocks={flocksList}
          selectedFlock={selectedFarmFilter}
          onSelectedFlockChange={setSelectedFarmFilter}
          formatDate={formatDate}
          renderStatusBadge={getStatusBadge}
        />
      )}

      {/* VIEW 2: OMS */}
      {activeTab === "oms" && (
        <OmsTab
          lang={lang}
          canCreateOrder={canCreateOrder}
          loading={oms.loading}
          rows={oms.rows.slice(0, 200)}
          statusFilter={oms.statusFilter}
          search={oms.search}
          selectedIds={oms.selectedIds}
          factoryInventory={factoryInventoryList}
          factoryTransactions={recentFactoryTxns}
          onStatusFilterChange={oms.setStatusFilter}
          onSearchChange={oms.setSearch}
          onReload={oms.refetch}
          onCreate={oms.openCreateModal}
          onSuggestTms={oms.suggestTmsMerge}
          onAssignTms={oms.requestAssignTmsUnfinished}
          onMergeTms={oms.requestMergeSelectedTms}
          onClearSelection={oms.clearSelection}
          onToggleSelection={oms.toggleSelection}
          onView={oms.viewTrace}
          onEdit={oms.openEditModal}
          formatDate={formatDate}
        />
      )}

      {/* VIEW 3: WMS */}
      {activeTab === "wms" && (
        <WmsTab
          lang={lang}
          canCreateOrder={canCreateOrder}
          canWrite={canWriteWms}
          loading={wms.loading}
          rows={wms.rows.slice(0, 200)}
          currentInfo={wms.currentInfo}
          facilities={wmsFacilityOptions}
          flocks={visibleFlockOptions}
          tenantFilter={wms.tenantFilter}
          flockFilter={wms.flockFilter}
          onTenantChange={wms.changeTenantFilter}
          onFlockChange={wms.changeFlockFilter}
          onCreateOrder={wms.openFarmOrderWizard}
          onCreateTransaction={wms.openTxnModal}
          onAdjust={wms.openAdjustModal}
          onReload={wms.refetch}
          formatDate={formatDate}
          renderStatusBadge={getStatusBadge}
        />
      )}

      {/* VIEW 4: FMS */}
      {activeTab === "fms" && (
        <FmsTab
          lang={lang}
          loading={fms.loading}
          canEditMort={canWriteFms}
          rows={pagedFms.slice}
          allRows={fms.rows}
          summary={fms.summary}
          chart={fms.chart}
          page={fms.page}
          total={pagedFms.total}
          totalPages={pagedFms.totalPages}
          flockFilter={fms.flockFilter}
          flocks={flockOptions}
          farms={farmTenantOptions}
          tenantFilter={fms.tenantFilter}
          selectedDate={fms.selectedDate}
          onFlockFilterChange={fms.changeFlockFilter}
          onTenantFilterChange={fms.changeTenantFilter}
          onSelectedDateChange={fms.changeSelectedDate}
          onReset={fms.resetFilters}
          onReload={fms.refetch}
          onToday={fms.goToToday}
          onEditMort={fms.openMortModal}
          onPageChange={fms.setPage}
          formatDate={formatDate}
          renderStatusBadge={getStatusBadge}
        />
      )}

      {/* VIEW 5: SETUP */}
      {activeTab === "setup" && (
        <SetupTab
          lang={lang}
          subTab={setupSubTab}
          onSubTabChange={(nextTab) => {
            setSetupSubTab(nextTab);
            setup.setAccountPage(1);
            setup.setFeedPage(1);
          }}
          loading={setup.loading}
          accountFilter={setup.accountFilter}
          accountRows={setup.accountRows}
          accountPage={setup.accountPage}
          accountTotal={setup.accountTotal}
          accountTotalPages={setup.accountTotalPages}
          onBlockChange={setup.changeBlock}
          onSystemChange={setup.setSystem}
          onTenantChange={setup.setTenant}
          onTenantIdChange={setup.setTenantId}
          onAddressChange={setup.setAddress}
          onFlockIdChange={setup.setFlockId}
          onFlockNameChange={setup.setFlockName}
          onCreateAccount={setup.openCreateAccountModal}
          onEditAccount={setup.editAccount}
          onAccountPageChange={setup.setAccountPage}
          chicken={setup.chicken}
          chickenOptions={setup.chickenOptions}
          onChickenChange={setup.changeChicken}
          feedType={setup.feedType}
          feedTypeOptions={setup.feedTypeOptions}
          onFeedTypeChange={setup.changeFeedType}
          age={setup.age}
          onAgeChange={setup.changeAge}
          feedRows={setup.feedRows}
          feedPage={setup.feedPage}
          feedTotal={setup.feedTotal}
          feedTotalPages={setup.feedTotalPages}
          onFeedPageChange={setup.setFeedPage}
          productRows={setup.productRows}
          policyRows={setup.policyRows}
          policySearch={setup.policySearch}
          onPolicySearchChange={setup.setPolicySearch}
          onCreateProduct={() => setup.setShowProductModal(true)}
          onCreatePolicy={() => setup.setShowPolicyModal(true)}
          onSavePolicyInline={setup.savePolicyInline}
          onReload={() => setup.refetch(setupSubTab)}
          formatDate={formatDate}
        />
      )}

      {setup.showAccountModal && (
        <SetupAccountModal
          lang={lang}
          editing={setup.accountEditing}
          form={setup.accountForm}
          setForm={setup.setAccountForm}
          chickenTypeOptions={setup.chickenTypeOptions}
          farmTenantRowsForFlockForm={setup.farmTenantRowsForFlockForm}
          deriveFlockGroup={setup.deriveFlockGroup}
          nextFlockTenantId={setup.nextFlockTenantId}
          buildDefaultAccountForm={setup.buildDefaultAccountForm}
          onSubmit={(event) => setup.createAccount(event, setupSubTab)}
          onClose={() => {
            setup.setShowAccountModal(false);
            setup.setAccountEditing(false);
          }}
        />
      )}

      {setup.showProductModal && (
        <SetupProductModal
          lang={lang}
          form={setup.productForm}
          setForm={setup.setProductForm}
          onSubmit={(event) => setup.submitProductForm(event, setupSubTab)}
          onClose={() => setup.setShowProductModal(false)}
        />
      )}

      {setup.showPolicyModal && (
        <SetupPolicyModal
          lang={lang}
          form={setup.policyForm}
          setForm={setup.setPolicyForm}
          productRows={setup.productRows}
          onSubmit={(event) => setup.submitPolicyForm(event, setupSubTab)}
          onClose={() => setup.setShowPolicyModal(false)}
        />
      )}

      {oms.showCreateModal && (
        <CreateOrderModal
          lang={lang}
          editingOrderId={oms.editingOrderId}
          form={oms.form}
          setForm={oms.setForm}
          operationalTenants={operationalTenants}
          productOptions={productOptions}
          tenantOptions={tenantOptions}
          flockOptions={flockOptions}
          orderLocationOptions={orderLocationOptions}
          orderFlockOptions={orderFlockOptions}
          onSubmit={oms.submitOrderForm}
          onClose={() => {
            oms.setShowCreateModal(false);
          }}
        />
      )}

      {wms.farmOrderStep > 0 && (
        <FarmOrderWizardModal
          lang={lang}
          tenantFilter={wms.tenantFilter}
          flockFilter={wms.flockFilter}
          step={wms.farmOrderStep as 1 | 2 | 3}
          loading={wms.farmOrderLoading}
          data={wms.farmOrderData}
          form={wms.farmOrderForm}
          setForm={wms.setFarmOrderForm}
          tenantOptions={tenantOptions}
          formatDate={formatDate}
          onSuggestSubmit={(event) =>
            wms.submitFarmOrderSuggest(event, lang, formatDate)
          }
          onPackageSubmit={wms.submitFarmOrderPackage}
          onCreateSubmit={wms.submitCreateFarmOrder}
          onBackToStep={wms.setFarmOrderStep}
          onClose={wms.closeFarmOrderWizard}
        />
      )}

      {wms.showTxnModal && (
        <WmsTransactionModal
          lang={lang}
          txnType={wms.txnType}
          form={wms.txnForm}
          setForm={wms.setTxnForm}
          productOptions={productOptions}
          flockOptions={flockOptions}
          wmsLocationOptions={wmsLocationOptions}
          onSubmit={wms.submitTxnForm}
          onClose={() => wms.setShowTxnModal(false)}
        />
      )}

      {oms.showTraceModal && oms.traceResult && (
        <OrderTraceModal
          lang={lang}
          canEdit={canCreateOrder}
          traceOrder={oms.traceResult}
          formatDate={formatDate}
          onEdit={(order) => oms.openEditModal(order)}
          onClose={() => oms.setShowTraceModal(false)}
        />
      )}

      {oms.showTmsSuggestionModal && (
        <TmsSuggestionModal
          lang={lang}
          suggestions={oms.tmsSuggestions}
          selected={oms.selectedTmsSuggestions}
          onToggle={(index, checked) =>
            oms.setSelectedTmsSuggestions((current) => ({
              ...current,
              [index]: checked,
            }))
          }
          formatDate={formatDate}
          onConfirm={oms.createSuggestedTms}
          onClose={() => oms.setShowTmsSuggestionModal(false)}
        />
      )}

      {oms.showTmsConfirmModal && (
        <TmsConfirmModal
          mode={oms.tmsConfirmMode}
          selectedCount={Object.keys(oms.selectedIds).length}
          onConfirm={
            oms.tmsConfirmMode === "selected"
              ? oms.confirmMergeSelectedTms
              : oms.confirmAssignTmsUnfinished
          }
          onClose={() => oms.setShowTmsConfirmModal(false)}
        />
      )}

      {wms.showAdjustModal && (
        <WmsAdjustModal
          form={wms.adjustForm}
          setForm={wms.setAdjustForm}
          productOptions={productOptions}
          flockOptions={flockOptions}
          onSubmit={wms.submitAdjustForm}
          onClose={() => wms.setShowAdjustModal(false)}
        />
      )}

      {fms.mortRow && (
        <FmsMortModal
          row={fms.mortRow}
          value={fms.mortValue}
          onValueChange={fms.setMortValue}
          formatDate={formatDate}
          lang={lang}
          onSubmit={fms.submitMortForm}
          onClose={fms.closeMortModal}
        />
      )}
    </div>
  );
}
