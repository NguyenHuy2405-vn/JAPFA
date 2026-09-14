/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

import React, { useEffect, useRef } from "react";
import { t } from "@/utils/i18n";

type Lang = "vi" | "en";

interface AlertItem {
  id: string;
  date: string;
  tenantId: string;
  farmName?: string;
  flockId: string;
  feedName: string;
  status: string;
}

interface DashboardTabProps {
  lang: Lang;
  orderCounts: Record<string, number>;
  totalOrders: number;
  fmsAlertCount: number;
  factorySkuCount: number;
  farmSkuCount: number;
  alerts: AlertItem[];
  flocks: string[];
  selectedFlock: string;
  onSelectedFlockChange: (value: string) => void;
  formatDate: (value: unknown, lang?: Lang) => string;
  renderStatusBadge: (status: string) => React.ReactNode;
}

const orderStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    planned: "#FFD400",
    deducted: "#0055DA",
    transit: "#e07a1f",
    completed: "#00C68D",
  };
  return colors[status] || "#64748b";
};

export function DashboardTab({
  lang,
  orderCounts,
  totalOrders,
  fmsAlertCount,
  factorySkuCount,
  farmSkuCount,
  alerts,
  flocks,
  selectedFlock,
  onSelectedFlockChange,
  formatDate,
  renderStatusBadge,
}: DashboardTabProps) {
  const pieChartRef = useRef<HTMLDivElement>(null);
  const filteredAlerts = selectedFlock
    ? alerts.filter(
        (alert) =>
          String(alert.tenantId).trim().toUpperCase() ===
          selectedFlock.trim().toUpperCase(),
      )
    : alerts;

  useEffect(() => {
    if (!pieChartRef.current) return;

    const renderChart = () => {
      const google = (window as any).google;
      if (!google?.visualization || !pieChartRef.current) return;
      const definitions = [
        ["PLANNED", "planned", t("statusPlanned", lang)],
        ["PICKED_UP", "deducted", t("statusDeducted", lang)],
        ["IN_TRANSIT", "transit", t("statusInTransit", lang)],
        ["COMPLETED", "completed", t("statusCompleted", lang)],
      ] as const;
      const rows: Array<[string, string | number]> = [
        [t("hStatus", lang), t("hCount", lang)],
      ];
      const colors: string[] = [];
      definitions.forEach(([key, status, label]) => {
        const count = Number(orderCounts[key] || 0);
        if (count <= 0) return;
        rows.push([label, count]);
        colors.push(orderStatusColor(status));
      });
      const data = google.visualization.arrayToDataTable(rows);
      new google.visualization.PieChart(pieChartRef.current).draw(data, {
        pieHole: 0.5,
        backgroundColor: "transparent",
        colors,
        chartArea: { width: "88%", height: "80%" },
        legend: {
          position: "right",
          textStyle: { color: "#4b6258", fontSize: 12 },
        },
        pieSliceText: "percentage",
      });
    };

    const google = (window as any).google;
    if (google?.charts) {
      google.charts.load("current", { packages: ["corechart"] });
      google.charts.setOnLoadCallback(renderChart);
      return;
    }
    const interval = window.setInterval(() => {
      if ((window as any).google?.visualization) {
        renderChart();
        window.clearInterval(interval);
      }
    }, 300);
    return () => window.clearInterval(interval);
  }, [lang, orderCounts]);

  return (
    <>
      <div style={{ marginBottom: "0.25rem" }}>
        <h2 className="dashboard-page-title">Bảng Điều hành Vận hành</h2>
        <p className="dashboard-page-description">{t("dashboardDesc", lang)}</p>
      </div>
      <div className="kpi-grid">
        {[
          ["warning", t("dashboardAlertTitle", lang), fmsAlertCount],
          ["factory", "Nhà máy SKU", factorySkuCount],
          ["agriculture", "Trang trại SKU", farmSkuCount],
          ["receipt_long", "Quản lý nhà máy (OMS + WMS) Tổng", totalOrders],
        ].map(([icon, label, value]) => (
          <div className="kpi-card" key={String(label)}>
            <div className="kpi-icon">
              <span className="material-symbols-outlined">{icon}</span>
            </div>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{value}</div>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card dashboard-alert-panel">
          <div
            className="section-header"
            style={{ borderBottom: "none", marginBottom: "0.5rem" }}
          >
            <div className="section-title">
              {t("dashboardAlertTitle", lang)}
            </div>
            <label className="filter-label">
              {t("dashboardAlertFlockFilterLabel", lang)}
              <select
                value={selectedFlock}
                onChange={(event) => onSelectedFlockChange(event.target.value)}
                className="filter-select dashboard-flock-select"
              >
                {flocks.map((flock) => (
                  <option key={flock} value={flock}>
                    {flock}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="table-responsive">
            <table className="japfa-table dashboard-alert-table">
              <thead>
                <tr>
                  <th>NGÀY THỰC HIỆN</th>
                  <th>TÊN FARM</th>
                  <th>MÃ ĐÀN GÀ</th>
                  <th>TÊN HÀNG HÓA</th>
                  <th>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center empty-cell">
                      {t("msgNoLowAlert", lang)}
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.date, lang)}</td>
                      <td className="font-semibold">
                        {item.farmName || item.tenantId}
                      </td>
                      <td>{item.flockId}</td>
                      <td>{item.feedName}</td>
                      <td>{renderStatusBadge(item.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card dashboard-chart-panel">
          <div className="section-title">
            {t("dashboardOrderPieTitle", lang)}
          </div>
          <div ref={pieChartRef} className="dashboard-pie-chart" />
        </div>
      </div>
    </>
  );
}
