/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

import React from "react";
import { t } from "@/utils/i18n";

interface WmsTabProps {
  lang: "vi" | "en";
  canCreateOrder: boolean;
  canWrite: boolean;
  loading: boolean;
  rows: any[];
  currentInfo: any;
  facilities: any[];
  flocks: any[];
  tenantFilter: string;
  flockFilter: string;
  onTenantChange: (value: string) => void;
  onFlockChange: (value: string) => void;
  onCreateOrder: () => void;
  onCreateTransaction: (type: "Inbound" | "Outbound") => void;
  onAdjust: () => void;
  onReload: () => void;
  formatDate: (value: unknown, lang?: "vi" | "en") => string;
  renderStatusBadge: (status: string) => React.ReactNode;
}

export function WmsTab(props: WmsTabProps) {
  const {
    lang,
    canCreateOrder,
    canWrite,
    loading,
    rows,
    currentInfo,
    facilities,
    flocks,
    tenantFilter,
    flockFilter,
    onTenantChange,
    onFlockChange,
    onCreateOrder,
    onCreateTransaction,
    onAdjust,
    onReload,
    formatDate,
    renderStatusBadge,
  } = props;
  return (
    <div className="dashboard-section wms-view">
      <div className="section-header">
        <div>
          <div className="section-title">WMS Farm - Tồn kho và giao dịch</div>
          <div className="section-description">
            Theo dõi tồn kho, nhập xuất tay và điều chỉnh tồn kho.
          </div>
        </div>
      </div>
      <div className="wms-filter-card card">
        <div className="wms-farm-filters">
          <label className="wms-filter-field">
            <span>Farm</span>
            <select
              className="filter-select"
              value={tenantFilter}
              onChange={(event) => onTenantChange(event.target.value)}
            >
              <option value="">Chọn Farm</option>
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.tenantId}>
                  {facility.managedBy || facility.name}
                </option>
              ))}
            </select>
          </label>
          <label className="wms-filter-field">
            <span>Flock</span>
            <select
              className="filter-select"
              value={flockFilter}
              onChange={(event) => onFlockChange(event.target.value)}
            >
              <option value="">Chọn Flock</option>
              {flocks.map((flock) => (
                <option key={flock.id} value={flock.flockId}>
                  {flock.flockId} - {flock.groupId || flock.name || ""}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-outline" onClick={onReload}>
            <span className="material-symbols-outlined">refresh</span>
            {t("reload", lang)}
          </button>
        </div>
      </div>
      <section className="wms-current-inventory card">
        <div className="wms-panel-heading">
          <span className="material-symbols-outlined">inventory_2</span>
          <h3>Tồn kho hiện tại</h3>
        </div>
        <div className="table-responsive">
          <table className="japfa-table">
            <thead>
              <tr>
                <th>Mã đàn gà</th>
                <th>Tên đàn</th>
                <th>Mã hàng (SKU)</th>
                <th>Mức cảnh báo</th>
                <th>Tồn kho hiện tại</th>
                <th>Tỷ lệ tồn kho (%)</th>
                <th>Date 1</th>
                <th>Date 2</th>
              </tr>
            </thead>
            <tbody>
              {!currentInfo ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    Chọn Farm/Flock để xem tồn kho.
                  </td>
                </tr>
              ) : (
                <tr>
                  <td className="font-semibold">
                    {currentInfo.flockId || flockFilter || "-"}
                  </td>
                  <td>{currentInfo.flockName || "-"}</td>
                  <td>{currentInfo.feedName || "-"}</td>
                  <td>
                    {renderStatusBadge(currentInfo.warningLabel || "NORMAL")}
                  </td>
                  <td className="font-bold text-primary">
                    {Math.ceil(Number(currentInfo.currentInventory) || 0)} kg
                  </td>
                  <td>
                    {currentInfo.stockLevelPercentage === null ||
                    currentInfo.stockLevelPercentage === undefined
                      ? "-"
                      : `${Number(currentInfo.stockLevelPercentage).toFixed(2)}%`}
                  </td>
                  <td>{formatDate(currentInfo.date1, lang)}</td>
                  <td>{formatDate(currentInfo.date2, lang)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {canCreateOrder && (
          <div className="wms-inventory-actions">
            <button className="btn btn-primary" onClick={onCreateOrder}>
              <span className="material-symbols-outlined">
                add_shopping_cart
              </span>
              Tạo đơn hàng
            </button>
          </div>
        )}
      </section>
      <div className="wms-transaction-panel card">
        <div className="wms-panel-heading">
          <span className="material-symbols-outlined">receipt_long</span>
          <h3>Giao dịch gần nhất</h3>
          <div className="wms-log-actions">
            {canWrite && (
              <>
                <button
                  className="btn btn-outline"
                  onClick={() => onCreateTransaction("Inbound")}
                >
                  <span className="material-symbols-outlined">move_down</span>{" "}
                  Nhập kho
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => onCreateTransaction("Outbound")}
                >
                  <span className="material-symbols-outlined">move_up</span>{" "}
                  Xuất kho
                </button>
                <button className="btn btn-outline" onClick={onAdjust}>
                  <span className="material-symbols-outlined">tune</span> Điều
                  chỉnh
                </button>
              </>
            )}
          </div>
        </div>
        <div className="table-responsive">
          <table className="japfa-table">
            <thead>
              <tr>
                <th>{t("hTxnDate", lang)}</th>
                <th>{t("hSku", lang)}</th>
                <th>{t("hTxnType", lang)}</th>
                <th>{t("hFlock", lang)}</th>
                <th>Tồn đầu kỳ</th>
                <th>Nhập</th>
                <th>Xuất</th>
                <th>Tồn cuối kỳ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center empty-cell">
                    {t("msgLoadingTransactions", lang)}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center empty-cell">
                    {t("msgNoTransactions", lang)}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.date, lang)}</td>
                    <td className="font-bold">
                      {row.product?.sku || row.sku || "-"}
                    </td>
                    <td>{row.txnType || row.loai_giao_dich || "-"}</td>
                    <td>{row.flock?.flockId || row.flock_id || "-"}</td>
                    <td>{Math.ceil(Number(row.beginQuantity) || 0)}</td>
                    <td>{Math.ceil(Number(row.inQuantity) || 0)}</td>
                    <td>{Math.ceil(Number(row.outQuantity) || 0)}</td>
                    <td className="font-bold">
                      {Math.ceil(Number(row.endQuantity) || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
