/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

import React, { useState, useEffect } from "react";
import { t } from "@/utils/i18n";
import {
  ACCOUNT_TABLE_COLUMNS,
  BLOCK_OPTIONS,
  type AccountBlock,
  type AccountFilterResult,
} from "@/utils/setupAccountFilters";

export type SetupSubTab = "account" | "standard" | "feed";

interface SetupTabProps {
  lang: "vi" | "en";
  subTab: SetupSubTab;
  onSubTabChange: (tab: SetupSubTab) => void;
  loading: boolean;
  // Account sub-tab props
  accountFilter: AccountFilterResult;
  accountRows: any[];
  accountPage: number;
  accountTotal: number;
  accountTotalPages: number;
  onBlockChange: (value: AccountBlock) => void;
  onSystemChange: (value: string) => void;
  onTenantChange: (value: string) => void;
  onTenantIdChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onFlockIdChange: (value: string) => void;
  onFlockNameChange: (value: string) => void;
  onCreateAccount: () => void;
  onEditAccount: (row: any) => void;
  onAccountPageChange: (page: number) => void;
  // Standard (Feed Standard) sub-tab props
  chicken: string;
  chickenOptions: string[];
  onChickenChange: (value: string) => void;
  feedType: string;
  feedTypeOptions: string[];
  onFeedTypeChange: (value: string) => void;
  age: string;
  onAgeChange: (value: string) => void;
  feedRows: any[];
  feedPage: number;
  feedTotal: number;
  feedTotalPages: number;
  onFeedPageChange: (page: number) => void;
  // Feed (Product Master & Policy Thresholds) sub-tab props
  productRows: any[];
  policyRows: any[];
  policySearch: string;
  onPolicySearchChange: (value: string) => void;
  onCreateProduct: () => void;
  onCreatePolicy: () => void;
  onSavePolicyInline: (
    sku: string,
    zero: number,
    critical: number,
    low: number,
    high: number,
    status: string,
    note: string,
  ) => Promise<void>;
  // Common props
  onReload: () => void;
  formatDate: (value: unknown, lang?: "vi" | "en") => string;
}

const formatFeedNumber = (val: unknown, decimals?: number) => {
  if (val === undefined || val === null || val === "") return "-";
  const num = Number(val);
  if (!isFinite(num)) return String(val);
  if (decimals === undefined || decimals === 0) {
    return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

function PolicyTableRow({
  row,
  lang,
  onSave,
}: {
  row: any;
  lang: "vi" | "en";
  onSave: (
    sku: string,
    zero: number,
    critical: number,
    low: number,
    high: number,
    status: string,
    note: string,
  ) => Promise<void>;
}) {
  const [status, setStatus] = useState(row.status || "active");
  const [note, setNote] = useState(row.note || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(row.status || "active");
    setNote(row.note || "");
  }, [row.status, row.note]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(
      row.ma_hang,
      Number(row.zero_threshold),
      Number(row.critical_threshold),
      Number(row.low_threshold),
      Number(row.high_threshold),
      status,
      note,
    );
    setSaving(false);
  };

  return (
    <tr>
      <td className="font-bold">{row.ma_hang}</td>
      <td>{row.zero_threshold}</td>
      <td>{row.critical_threshold}</td>
      <td>{row.low_threshold}</td>
      <td>{row.high_threshold}</td>
      <td>
        <select
          className="filter-select"
          style={{ minWidth: 100, padding: "4px 8px" }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="active">{t("statusActive", lang)}</option>
          <option value="inactive">{t("statusInactive", lang)}</option>
        </select>
      </td>
      <td>
        <input
          className="filter-input"
          style={{ width: "100%", minWidth: 120, padding: "4px 8px" }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </td>
      <td>
        <button
          className="btn btn-outline btn-sm"
          type="button"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? t("commonSaving", lang) : t("commonSave", lang)}
        </button>
      </td>
    </tr>
  );
}

export function SetupTab(props: SetupTabProps) {
  const {
    lang,
    subTab,
    onSubTabChange,
    loading,
    accountFilter,
    accountRows,
    accountPage,
    accountTotal,
    accountTotalPages,
    onBlockChange,
    onSystemChange,
    onTenantChange,
    onTenantIdChange,
    onAddressChange,
    onFlockIdChange,
    onFlockNameChange,
    onCreateAccount,
    onEditAccount,
    onAccountPageChange,
    chicken,
    chickenOptions,
    onChickenChange,
    feedType,
    feedTypeOptions,
    onFeedTypeChange,
    age,
    onAgeChange,
    feedRows,
    feedPage,
    feedTotal,
    feedTotalPages,
    onFeedPageChange,
    productRows,
    policyRows,
    policySearch,
    onPolicySearchChange,
    onCreateProduct,
    onCreatePolicy,
    onSavePolicyInline,
    onReload,
    formatDate,
  } = props;

  const tabs: Array<[SetupSubTab, string, string]> = [
    ["account", "manage_accounts", t("setupTabAccount", lang)],
    ["standard", "policy", t("setupTabStandard", lang)],
    ["feed", "nutrition", t("setupTabFeed", lang)],
  ];

  const accountColumns = ACCOUNT_TABLE_COLUMNS[accountFilter.effective.block];

  return (
    <div className="dashboard-section setup-view">
      <div className="section-header setup-header">
        <div>
          <div className="section-title">{t("setupTitle", lang)}</div>
          <div className="section-description">{t("setupDesc", lang)}</div>
        </div>
      </div>

      <div className="sub-tab-bar setup-sub-tab-bar">
        {tabs.map(([key, icon, label]) => (
          <button
            key={key}
            className={`sub-tab ${subTab === key ? "active" : ""}`}
            onClick={() => onSubTabChange(key)}
          >
            <span className="material-symbols-outlined">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: ACCOUNT (TÀI KHOẢN) */}
      {subTab === "account" && (
        <>
          <div className="card setup-filter-card">
            <div className="setup-filter-card-header">
              <button
                className="btn btn-primary"
                onClick={onCreateAccount}
                type="button"
              >
                <span className="material-symbols-outlined">add_circle</span>
                {t("setupAccountBtn", lang)}
              </button>
            </div>
            <div className="setup-filter-bar">
              <select
                className="filter-select"
                title={t("setupFilterBlockLabel", lang)}
                value={accountFilter.effective.block}
                onChange={(e) => onBlockChange(e.target.value as AccountBlock)}
              >
                {BLOCK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                className="filter-select"
                title={t("setupFilterSystemLabel", lang)}
                value={accountFilter.effective.system}
                onChange={(e) => onSystemChange(e.target.value)}
              >
                {accountFilter.options.system.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              {accountFilter.visibility.tenant && (
                <select
                  className="filter-select"
                  title={t("setupFilterTenantLabel", lang)}
                  value={accountFilter.effective.tenant}
                  onChange={(e) => onTenantChange(e.target.value)}
                >
                  <option value="">{t("allTenantNames", lang)}</option>
                  {accountFilter.options.tenant.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
              {accountFilter.visibility.tenantId && (
                <select
                  className="filter-select"
                  title={t("setupFilterTenantIdLabel", lang)}
                  value={accountFilter.effective.tenantId}
                  onChange={(e) => onTenantIdChange(e.target.value)}
                >
                  <option value="">{t("allTenantIds", lang)}</option>
                  {accountFilter.options.tenantId.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
              <select
                className="filter-select"
                title={t("setupFilterAddressLabel", lang)}
                value={accountFilter.effective.address}
                onChange={(e) => onAddressChange(e.target.value)}
              >
                <option value="">{t("allAddresses", lang)}</option>
                {accountFilter.options.address.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              {accountFilter.visibility.flockId && (
                <select
                  className="filter-select"
                  title={t("setupFilterFlockIdLabel", lang)}
                  value={accountFilter.effective.flockId}
                  onChange={(e) => onFlockIdChange(e.target.value)}
                >
                  <option value="">{t("allFlockIds", lang)}</option>
                  {accountFilter.options.flockId.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
              {accountFilter.visibility.flockName && (
                <select
                  className="filter-select"
                  title={t("setupFilterFlockNameLabel", lang)}
                  value={accountFilter.effective.flockName}
                  onChange={(e) => onFlockNameChange(e.target.value)}
                >
                  <option value="">{t("allFlockNames", lang)}</option>
                  {accountFilter.options.flockName.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
              <button
                className="btn btn-outline"
                onClick={onReload}
                type="button"
              >
                {t("reload", lang)}
              </button>
            </div>
          </div>

          <div className="card setup-table-card">
            <div className="table-responsive">
              <table className="japfa-table">
                <thead>
                  <tr>
                    <th className="setup-edit-col" />
                    {accountColumns.map((column) => (
                      <th key={column.key}>
                        {t(column.labelKey as Parameters<typeof t>[0], lang)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={accountColumns.length + 1}
                        className="text-center empty-cell"
                      >
                        {t("msgLoadingDashboard", lang)}
                      </td>
                    </tr>
                  ) : accountRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={accountColumns.length + 1}
                        className="text-center empty-cell"
                      >
                        {t("msgNoConfig", lang)}
                      </td>
                    </tr>
                  ) : (
                    accountRows.map((row, index) => (
                      <tr
                        key={
                          row._id ? `${row._kind}-${row._id}-${index}` : index
                        }
                      >
                        <td className="setup-edit-col">
                          <button
                            type="button"
                            className="btn-icon"
                            title={t("editAction", lang)}
                            onClick={() => onEditAccount(row)}
                          >
                            <span className="material-symbols-outlined">
                              edit
                            </span>
                          </button>
                        </td>
                        {accountColumns.map((column) => {
                          const raw = row[column.key];
                          const display =
                            column.key === "start_flock_date" && raw
                              ? formatDate(raw, lang)
                              : raw;
                          return (
                            <td
                              key={column.key}
                              className={
                                column.key === "system" ? "font-bold" : ""
                              }
                            >
                              {display || display === 0 ? String(display) : "-"}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="pagination-bar">
              <div className="pagination-info">
                Tổng <strong>{accountTotal}</strong> bản ghi
              </div>
              <div className="pagination-controls">
                <button
                  className="page-btn"
                  disabled={accountPage <= 1}
                  onClick={() =>
                    onAccountPageChange(Math.max(1, accountPage - 1))
                  }
                >
                  ◀ Trước
                </button>
                <span className="page-num">
                  Trang {accountPage} / {accountTotalPages}
                </span>
                <button
                  className="page-btn"
                  disabled={accountPage >= accountTotalPages}
                  onClick={() =>
                    onAccountPageChange(
                      Math.min(accountTotalPages, accountPage + 1),
                    )
                  }
                >
                  Sau ▶
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SUB-TAB 2: STANDARD (TIÊU CHUẨN - FEED STANDARD) */}
      {subTab === "standard" && (
        <>
          <div className="card setup-filter-card">
            <div className="setup-filter-bar">
              <select
                className="filter-select"
                title={t("fChickenType", lang)}
                value={chicken}
                onChange={(e) => onChickenChange(e.target.value)}
              >
                <option value="">{t("allChickenTypes", lang)}</option>
                {chickenOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <select
                className="filter-select"
                title={t("fFeedType", lang)}
                value={feedType}
                onChange={(e) => onFeedTypeChange(e.target.value)}
              >
                <option value="">{t("allFeedTypes", lang)}</option>
                {feedTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <input
                className="filter-input setup-age-filter"
                type="number"
                min="0"
                placeholder={t("hAge", lang)}
                value={age}
                onChange={(event) => onAgeChange(event.target.value)}
              />
              <button
                className="btn btn-outline"
                onClick={onReload}
                type="button"
              >
                {t("reload", lang)}
              </button>
            </div>
          </div>

          <div className="card setup-table-card">
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <h3 style={{ margin: 0 }}>{t("setupFeedTitle", lang)}</h3>
            </div>
            <div className="table-responsive">
              <table className="japfa-table">
                <thead>
                  <tr>
                    <th>{t("fChickenType", lang)}</th>
                    <th>{t("hAge", lang)}</th>
                    <th>{t("fFeedUse", lang)}</th>
                    <th>{t("hCumFeed", lang)}</th>
                    <th>{t("hFcr", lang)}</th>
                    <th>{t("hCumDep", lang)}</th>
                    <th>{t("hBodyWeight", lang)}</th>
                    <th>{t("fFeedType", lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center empty-cell">
                        {t("msgLoadingDashboard", lang)}
                      </td>
                    </tr>
                  ) : feedRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center empty-cell">
                        {t("msgNoFeedMatch", lang)}
                      </td>
                    </tr>
                  ) : (
                    feedRows.map((row, index) => (
                      <tr key={row.id || index}>
                        <td className="font-bold">{row.loai_ga || "-"}</td>
                        <td>
                          {row.ngay_tuoi !== undefined && row.ngay_tuoi !== null
                            ? String(row.ngay_tuoi)
                            : "-"}
                        </td>
                        <td>{formatFeedNumber(row.ta_su_dung_g_c_n, 1)}</td>
                        <td>
                          {formatFeedNumber(
                            row.thuc_an_su_dung_cong_don_g_c,
                            0,
                          )}
                        </td>
                        <td>
                          {formatFeedNumber(row.he_so_su_dung_thuc_an, 3)}
                        </td>
                        <td>{formatFeedNumber(row.hao_hut_cong_don, 2)}</td>
                        <td>
                          {formatFeedNumber(
                            row.binh_quan_khoi_luong_co_the_g,
                            0,
                          )}
                        </td>
                        <td>{row.loai_cam || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="pagination-bar">
              <div className="pagination-info">
                Tổng <strong>{feedTotal}</strong> bản ghi
              </div>
              <div className="pagination-controls">
                <button
                  className="page-btn"
                  disabled={feedPage <= 1}
                  onClick={() => onFeedPageChange(Math.max(1, feedPage - 1))}
                >
                  ◀ Trước
                </button>
                <span className="page-num">
                  Trang {feedPage} / {feedTotalPages}
                </span>
                <button
                  className="page-btn"
                  disabled={feedPage >= feedTotalPages}
                  onClick={() =>
                    onFeedPageChange(Math.min(feedTotalPages, feedPage + 1))
                  }
                >
                  Sau ▶
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SUB-TAB 3: FEED (THỨC ĂN - PRODUCT MASTER + POLICY THRESHOLDS) */}
      {subTab === "feed" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card setup-filter-card">
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <button
                className="btn btn-outline"
                onClick={onCreateProduct}
                type="button"
              >
                <span className="material-symbols-outlined">barcode</span>
                {t("setupProductBtn", lang)}
              </button>
              <button
                className="btn btn-primary"
                onClick={onCreatePolicy}
                type="button"
              >
                <span className="material-symbols-outlined">policy</span>
                {t("setupPolicyBtn", lang)}
              </button>
            </div>
          </div>

          {/* Product Master Table */}
          <div className="card setup-table-card">
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <h3 style={{ margin: 0 }}>{t("setupProductTitle", lang)}</h3>
            </div>
            <div className="table-responsive">
              <table className="japfa-table">
                <thead>
                  <tr>
                    <th>{t("hSku", lang)}</th>
                    <th>{t("hProductName", lang)}</th>
                    <th>{t("fProductType", lang)}</th>
                    <th>{t("fUom", lang)}</th>
                    <th>{t("fUomWeight", lang)}</th>
                    <th>{t("hStatus", lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center empty-cell">
                        {t("msgLoadingDashboard", lang)}
                      </td>
                    </tr>
                  ) : productRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center empty-cell">
                        {t("msgNoProduct", lang)}
                      </td>
                    </tr>
                  ) : (
                    productRows.map((row, index) => (
                      <tr key={row.sku || index}>
                        <td className="font-bold">{row.sku}</td>
                        <td>{row.ten_hang_hoa}</td>
                        <td>{row.loai_san_pham || "-"}</td>
                        <td>{row.uom || "-"}</td>
                        <td>
                          {row.uom_weight_kg !== undefined
                            ? `${row.uom_weight_kg} kg`
                            : "-"}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              String(row.status).toUpperCase() === "ACTIVE"
                                ? "badge-success"
                                : "badge-low"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Policy Thresholds Table */}
          <div className="card setup-table-card">
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <h3 style={{ margin: 0 }}>{t("setupPolicyTitle", lang)}</h3>
            </div>
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid var(--line)",
                background: "var(--surface-2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  className="material-symbols-outlined"
                  style={{ color: "var(--text-soft)" }}
                >
                  search
                </span>
                <input
                  className="filter-input"
                  style={{ width: "100%", maxWidth: 400 }}
                  placeholder={t("setupPolicySearch", lang)}
                  value={policySearch}
                  onChange={(e) => onPolicySearchChange(e.target.value)}
                />
              </div>
            </div>
            <div className="table-responsive">
              <table className="japfa-table">
                <thead>
                  <tr>
                    <th>{t("hSku", lang)}</th>
                    <th>{t("hZero", lang)}</th>
                    <th>{t("hCritical", lang)}</th>
                    <th>{t("hLow", lang)}</th>
                    <th>{t("hHigh", lang)}</th>
                    <th>{t("hStatus", lang)}</th>
                    <th>{t("hNote", lang)}</th>
                    <th>{t("hAction", lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center empty-cell">
                        {t("msgLoadingDashboard", lang)}
                      </td>
                    </tr>
                  ) : policyRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center empty-cell">
                        {t("msgNoPolicyMatch", lang)}
                      </td>
                    </tr>
                  ) : (
                    policyRows.map((row, index) => (
                      <PolicyTableRow
                        key={row.ma_hang || index}
                        row={row}
                        lang={lang}
                        onSave={onSavePolicyInline}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
