/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

import React from "react";
import { t } from "@/utils/i18n";

interface OmsTabProps {
  lang: "vi" | "en";
  canCreateOrder: boolean;
  loading: boolean;
  rows: any[];
  statusFilter: string;
  search: string;
  selectedIds: Record<string, boolean>;
  factoryInventory: any[];
  factoryTransactions: any[];
  onStatusFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onReload: () => void;
  onCreate: () => void;
  onSuggestTms: () => void;
  onAssignTms: () => void;
  onMergeTms: () => void;
  onClearSelection: () => void;
  onToggleSelection: (id: string, checked: boolean) => void;
  onView: (id: string, row: any) => void;
  onEdit: (row: any) => void;
  formatDate: (value: unknown, lang?: "vi" | "en") => string;
}

const StatusBadge = ({
  status,
  lang,
}: {
  status: string;
  lang: "vi" | "en";
}) => {
  const normalized = String(status || "").toUpperCase();
  const styles: Record<string, string> = {
    PLANNED: "badge-low",
    PICKED_UP: "badge-high",
    IN_TRANSIT: "badge-warning",
    COMPLETED: "badge-safe",
  };
  const labels: Record<string, string> = {
    PLANNED: t("statusPlanned", lang),
    PICKED_UP: t("statusPickedUp", lang),
    IN_TRANSIT: t("statusInTransit", lang),
    COMPLETED: t("statusCompleted", lang),
  };
  return (
    <span className={`badge ${styles[normalized] || "badge-safe"}`}>
      {labels[normalized] || status}
    </span>
  );
};

export function OmsTab(props: OmsTabProps) {
  const {
    lang,
    canCreateOrder,
    loading,
    rows,
    statusFilter,
    search,
    selectedIds,
    factoryInventory,
    factoryTransactions,
    onStatusFilterChange,
    onSearchChange,
    onReload,
    onCreate,
    onSuggestTms,
    onAssignTms,
    onMergeTms,
    onClearSelection,
    onToggleSelection,
    onView,
    onEdit,
    formatDate,
  } = props;
  const selectedCount = Object.keys(selectedIds).length;
  return (
    <div className="dashboard-section oms-view">
      <div className="section-header oms-header oms-view-header">
        <div>
          <div className="section-title">{t("omsTitle", lang)}</div>
          <div className="section-description">{t("omsDesc", lang)}</div>
        </div>
        <div className="action-group oms-actions">
          {canCreateOrder && (
            <>
              <button className="btn btn-outline" onClick={onSuggestTms}>
                <span className="material-symbols-outlined">route</span>
                Gợi ý ghép TMS
              </button>
              <button className="btn btn-outline" onClick={onAssignTms}>
                <span className="material-symbols-outlined">auto_awesome</span>
                Tạo TMS chưa hoàn tất
              </button>
              <button className="btn btn-primary" onClick={onCreate}>
                <span className="material-symbols-outlined">add_circle</span>
                {t("btnCreateOrder", lang)}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="card oms-control-card">
        <div className="oms-filter-bar">
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
            className="filter-select"
          >
            <option value="ALL">{t("statusAll", lang)}</option>
            <option value="PLANNED">{t("statusPlanned", lang)}</option>
            <option value="PICKED_UP">{t("statusPickedUp", lang)}</option>
            <option value="IN_TRANSIT">{t("statusInTransit", lang)}</option>
            <option value="COMPLETED">{t("statusCompleted", lang)}</option>
          </select>
          <label className="oms-search-box">
            <span className="material-symbols-outlined">search</span>
            <input
              className="filter-input"
              placeholder={t("searchOms", lang)}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && onReload()}
            />
          </label>
          <button className="btn btn-outline" onClick={onReload}>
            <span className="material-symbols-outlined">refresh</span>
            {t("reload", lang)}
          </button>
        </div>
        {selectedCount > 0 && (
          <div className="oms-selection-toolbar">
            <span>Đã chọn {selectedCount} đơn</span>
            <button className="btn btn-primary btn-sm" onClick={onMergeTms}>
              <span className="material-symbols-outlined">merge</span>
              Ghép thành một lô TMS
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClearSelection}>
              Bỏ chọn
            </button>
          </div>
        )}
      </div>
      <div className="card oms-table-card">
        <div className="table-responsive">
          <table className="japfa-table oms-table">
            <thead>
              <tr>
                <th>Chọn</th>
                <th>{t("hOrderId", lang)}</th>
                <th>{t("hClient", lang)}</th>
                <th>{t("hSku", lang)}</th>
                <th>{t("hQty", lang)}</th>
                <th>{t("hFrom", lang)}</th>
                <th>{t("hTo", lang)}</th>
                <th>{t("hFlock", lang)}</th>
                <th>{t("hStatus", lang)}</th>
                <th>{t("hTmsOrderId", lang)}</th>
                <th>{t("hCreateDate", lang)}</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center empty-cell">
                    {t("msgLoadingOrders", lang)}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center empty-cell">
                    {t("msgNoOrders", lang)}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const id = row.orderId || row.order_id;
                  return (
                    <tr
                      key={row.id || id}
                      className="oms-clickable-row"
                      tabIndex={0}
                      onClick={() => onView(id, row)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onView(id, row);
                        }
                      }}
                    >
                      <td onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          disabled={
                            String(row.status) !== "PLANNED" ||
                            Boolean(row.tmsOrderId && row.tmsOrderId !== "-")
                          }
                          checked={Boolean(selectedIds[id])}
                          onChange={(event) =>
                            onToggleSelection(id, event.target.checked)
                          }
                        />
                      </td>
                      <td className="font-bold text-primary">{id}</td>
                      <td>{row.client || "-"}</td>
                      <td className="font-semibold">
                        {row.sku || row.ma_hang}
                      </td>
                      <td>{row.quantity ?? row.so_luong ?? 0}</td>
                      <td>{row.origin || row.noi_i || "-"}</td>
                      <td>{row.destination || row.noi_en || "-"}</td>
                      <td>{row.flockId || "-"}</td>
                      <td>
                        <StatusBadge status={row.status} lang={lang} />
                      </td>
                      <td>
                        {row.tmsOrderId && row.tmsOrderId !== "-" ? (
                          <span className="badge badge-outline">
                            {row.tmsOrderId}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {formatDate(row.createDate || row.create_date, lang)}
                      </td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <button
                          className="btn-icon"
                          disabled={
                            String(row.status) === "COMPLETED" ||
                            !canCreateOrder
                          }
                          title={
                            String(row.status) === "COMPLETED"
                              ? "Đơn đã Hoàn tất, không thể cập nhật"
                              : "Sửa đơn hàng"
                          }
                          onClick={() => onEdit(row)}
                          aria-label="Sửa đơn hàng"
                        >
                          <span className="material-symbols-outlined">
                            edit
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <section className="card oms-factory-section" id="omsFactoryCard">
        <div className="factory-section-heading">
          <h3>Nhà máy</h3>
        </div>
        <div className="factory-panels">
          <div className="card factory-subpanel">
            <div className="factory-subpanel-heading">
              <h4>Tồn kho hiện tại</h4>
            </div>
            <div className="table-responsive">
              <table className="japfa-table">
                <thead>
                  <tr>
                    <th>Mã hàng (SKU)</th>
                    <th>Tồn kho hiện tại</th>
                    <th>Ngày giao dịch gần nhất</th>
                  </tr>
                </thead>
                <tbody>
                  {factoryInventory.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center empty-cell">
                        Chưa có dữ liệu tồn kho
                      </td>
                    </tr>
                  ) : (
                    factoryInventory.map((item) => (
                      <tr key={item.id}>
                        <td className="font-semibold">{item.sku}</td>
                        <td className="font-bold text-primary">{item.bags}</td>
                        <td>{formatDate(item.lastDate, lang)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card factory-subpanel">
            <div className="factory-subpanel-heading">
              <h4>Giao dịch gần nhất</h4>
            </div>
            <div className="table-responsive">
              <table className="japfa-table">
                <thead>
                  <tr>
                    <th>Ngày thực hiện</th>
                    <th>Tenant_ID</th>
                    <th>Mã hàng</th>
                    <th>Loại giao dịch</th>
                    <th>Nhập</th>
                    <th>Xuất</th>
                    <th>Tồn kho cuối kỳ</th>
                  </tr>
                </thead>
                <tbody>
                  {factoryTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center empty-cell">
                        Chưa có giao dịch
                      </td>
                    </tr>
                  ) : (
                    factoryTransactions.map((txn) => (
                      <tr key={txn.id}>
                        <td>{formatDate(txn.date, lang)}</td>
                        <td>{txn.tenantId}</td>
                        <td className="font-semibold">{txn.sku}</td>
                        <td className="factory-txn-type">{txn.txnType}</td>
                        <td>{txn.qtyIn || 0}</td>
                        <td>{txn.qtyOut || 0}</td>
                        <td className="font-bold">{txn.endQty || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
