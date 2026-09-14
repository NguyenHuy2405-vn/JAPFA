/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

import React, { useEffect, useRef } from "react";
import { t } from "@/utils/i18n";

interface FmsTabProps {
  lang: "vi" | "en";
  loading: boolean;
  canEditMort: boolean;
  rows: any[];
  allRows: any[];
  summary: any;
  chart: any[];
  page: number;
  total: number;
  totalPages: number;
  flockFilter: string;
  flocks: any[];
  farms: any[];
  tenantFilter: string;
  selectedDate: string;
  onFlockFilterChange: (flockId: string, tenantId: string) => void;
  onTenantFilterChange: (tenantId: string) => void;
  onSelectedDateChange: (value: string) => void;
  onReset: () => void;
  onReload: () => void;
  onToday: () => void;
  onEditMort: (row: any) => void;
  onPageChange: (page: number) => void;
  formatDate: (value: unknown, lang?: "vi" | "en") => string;
  renderStatusBadge: (status: string) => React.ReactNode;
}

const isoDate = (value: unknown) => {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const numberFormatter = (lang: "vi" | "en", maximumFractionDigits = 0) =>
  new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  });

export function FmsTab(props: FmsTabProps) {
  const {
    lang,
    loading,
    canEditMort,
    rows,
    allRows,
    summary,
    chart,
    page,
    total,
    totalPages,
    flockFilter,
    flocks,
    farms,
    tenantFilter,
    selectedDate,
    onFlockFilterChange,
    onTenantFilterChange,
    onSelectedDateChange,
    onReset,
    onReload,
    onToday,
    onEditMort,
    onPageChange,
    formatDate,
    renderStatusBadge,
  } = props;

  const chartRef = useRef<HTMLDivElement>(null);
  const dates = allRows.map((row) => isoDate(row.date)).filter(Boolean);
  const today = isoDate(new Date());
  const formatNumber = (value: unknown, maximumFractionDigits = 0) => {
    const number = Number(value);
    return Number.isFinite(number)
      ? numberFormatter(lang, maximumFractionDigits).format(number)
      : "-";
  };
  const formatFeedState = (value: unknown) => {
    const state = String(value || "").toLowerCase();
    if (lang === "en") {
      return state === "actual"
        ? "Actual"
        : state === "estimate"
          ? "Estimate"
          : state === "forecast"
            ? "Forecast"
            : String(value || "-");
    }
    return state === "actual"
      ? "Thực tế"
      : state === "estimate"
        ? "Ước tính"
        : state === "forecast"
          ? "Dự báo"
          : String(value || "-");
  };

  useEffect(() => {
    if (!chartRef.current || !chart.length) return;
    const draw = () => {
      const google = (window as any).google;
      if (!google?.visualization || !chartRef.current) return;
      const values = chart
        .flatMap((row) => [row.population_act, row.population_est])
        .map(Number)
        .filter((value) => Number.isFinite(value) && value > 0);
      const minPopulation = values.length ? Math.min(...values) : 0;
      const maxPopulation = values.length ? Math.max(...values) : 100;
      const step = 200;
      const axisMin = values.length
        ? Math.floor(minPopulation / step) * step
        : 0;
      const axisMax = Math.max(
        axisMin + step,
        Math.ceil(maxPopulation / step) * step,
      );
      const axisTicks = [];
      for (let tick = axisMin; tick <= axisMax; tick += step) {
        axisTicks.push(tick);
      }
      const data = google.visualization.arrayToDataTable([
        [
          t("fmsColAge", lang),
          lang === "vi" ? "Thực tế" : "Actual",
          lang === "vi" ? "Ước tính" : "Estimate",
        ],
        ...chart.map((row) => [
          row.age,
          row.population_act,
          row.population_est,
        ]),
      ]);
      new google.visualization.AreaChart(chartRef.current).draw(data, {
        backgroundColor: "transparent",
        colors: ["#245d4b", "#e0a31a"],
        chartArea: { left: 60, top: 20, width: "78%", height: "70%" },
        legend: { position: "top" },
        hAxis: { title: t("fmsColAge", lang) },
        vAxis: {
          viewWindow: { min: axisMin, max: axisMax },
          viewWindowMode: "explicit",
          ticks: axisTicks,
          format: "#,###",
        },
      });
    };
    const google = (window as any).google;
    if (google?.charts) {
      google.charts.load("current", {
        packages: ["corechart"],
        language: lang === "vi" ? "vi" : "en",
      });
      google.charts.setOnLoadCallback(draw);
      return;
    }
    const timer = window.setInterval(() => {
      if ((window as any).google?.visualization) {
        draw();
        window.clearInterval(timer);
      }
    }, 300);
    return () => window.clearInterval(timer);
  }, [chart, lang]);

  const visibleFlocks = flocks.filter(
    (flock) => !tenantFilter || flock.tenantId === tenantFilter,
  );

  const metrics = summary
    ? [
        [t("hFlock", lang), summary.flock_id || summary.FLOCK_ID || "-"],
        [
          t("fmsCurrentAge", lang),
          formatNumber(summary.age_in_days ?? summary["Ngày Tuổi"]),
        ],
        [
          t("fmsChickenType", lang),
          summary.chicken_type || summary["Loại Gà"] || "-",
        ],
        [
          t("fmsPopulationActual", lang),
          formatNumber(summary.population_act ?? summary.POPULATION_act),
        ],
        [
          t("fmsPopulationEstimate", lang),
          formatNumber(summary.population_est ?? summary.POPULATION_est),
        ],
        [
          t("fmsFinalFeedStock", lang),
          formatNumber(summary.feed_end_qtty ?? summary.FEED_end_qtty, 3),
        ],
        [
          t("fmsFeedState", lang),
          formatFeedState(summary.feed_state || summary["FEED state"]),
        ],
        [
          t("hStockLevelPct", lang),
          summary.stock_level_percentage == null &&
          summary["Stock level percentage"] == null
            ? "-"
            : `${formatNumber(summary.stock_level_percentage ?? summary["Stock level percentage"], 2)}%`,
        ],
      ]
    : [];

  return (
    <div className="dashboard-section fms-view" id="view-fms">
      <div className="section-header fms-view-header">
        <div>
          <div className="section-title">{t("fmsTitle", lang)}</div>
          <div className="section-description">{t("fmsSummaryDesc", lang)}</div>
        </div>
      </div>

      <div className="card fms-filter-card" style={{ padding: "10px" }}>
        <div className="filter-bar fms-filter-grid">
          <label className="fms-filter-field">
            <label className="form-label" htmlFor="fmsFarmSearch">
              {t("fmsFarmLabel", lang)}
            </label>
            <select
              className="form-control"
              id="fmsFarmSearch"
              value={tenantFilter}
              onChange={(e) => {
                onTenantFilterChange(e.target.value);
                onFlockFilterChange("", e.target.value);
              }}
            >
              <option value="">{t("fmsFarmPlaceholder", lang)}</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.tenantId}>
                  {farm.managedBy || farm.name || farm.tenantId}
                </option>
              ))}
            </select>
          </label>
          <div className="fms-filter-field">
            <label className="form-label" htmlFor="fmsFlockFilter">
              {t("fmsFlockLabel", lang)}
            </label>
            <select
              className="form-control"
              id="fmsFlockFilter"
              value={flockFilter}
              onChange={(e) => {
                const match = flocks.find((f) => f.flockId === e.target.value);
                onFlockFilterChange(e.target.value, match?.tenantId || "");
              }}
            >
              <option value="">{t("fmsSelectFlock", lang)}</option>
              {visibleFlocks.map((flock) => (
                <option key={flock.id} value={flock.flockId}>
                  {flock.flockId} - {flock.groupId || flock.name || ""}
                </option>
              ))}
            </select>
          </div>
          <div className="fms-filter-action">
            <button
              className="btn-icon fms-reset-filter-btn"
              type="button"
              onClick={onReset}
              title={t("fmsResetFilters", lang)}
              aria-label={t("fmsResetFilters", lang)}
            >
              <span className="material-symbols-outlined">restart_alt</span>
            </button>
            <button
              className="btn btn-outline"
              id="btnFmsRefresh"
              type="button"
              onClick={onReload}
              disabled={!flockFilter}
            >
              <span className="material-symbols-outlined">refresh</span>
              <span id="btnFmsRefreshLabel">Tải lại</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: "10px" }}>
        <div className="card fms-overview-card" id="fmsSummaryCard">
          <h3
            style={{
              margin: "0 0 10px",
              fontFamily: "Sora, sans-serif",
              fontSize: "14px",
            }}
          >
            {t("fmsSummaryCurrent", lang)}
          </h3>
          {summary ? (
            <div className="fms-overview-grid">
              {metrics.map(([label, value]) => (
                <div className="fms-metric-card" key={String(label)}>
                  <div className="fms-metric-label">{label}</div>
                  <div className="fms-metric-value">{value ?? "-"}</div>
                </div>
              ))}
              <div className="fms-metric-card">
                <div className="fms-metric-label">
                  {t("fmsAlertLevel", lang)}
                </div>
                <div className="fms-metric-value" style={{ marginTop: "4px" }}>
                  {renderStatusBadge(
                    summary.inventory_thresholds ||
                      summary["Inventory Thresholds"] ||
                      "NORMAL",
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="state-box">
              <span className="material-symbols-outlined">pets</span>
              <span>
                {flockFilter
                  ? t("msgNoFmsData", lang)
                  : t("msgSelectFlockSummary", lang)}
              </span>
            </div>
          )}
        </div>

        <div className="card fms-chart-card">
          <h3
            style={{
              margin: "0 0 10px",
              fontFamily: "Sora, sans-serif",
              fontSize: "14px",
            }}
            id="fmsChartTitle"
          >
            {t("fmsChartActualEstimate", lang)}
          </h3>
          <div className="fms-chart-stage">
            {chart.length ? (
              <div
                id="fmsPopulationChart"
                ref={chartRef}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <div className="state-box" id="fmsPopulationEmpty">
                <span className="material-symbols-outlined">query_stats</span>
                <span id="fmsPopulationEmptyText">
                  {flockFilter
                    ? t("fmsNoChartData", lang)
                    : t("fmsSelectFlockChart", lang)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="card fms-log-card"
        style={{ padding: 0, marginTop: "10px" }}
      >
        <div
          className="fms-log-head"
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: "Sora, sans-serif",
              fontSize: "14px",
            }}
            id="fmsLogTitle"
          >
            {t("fmsLogTitle", lang)}
          </h3>
          <div className="fms-log-nav">
            <button
              className="btn btn-outline btn-sm"
              id="btnFmsToday"
              type="button"
              onClick={onToday}
              disabled={!allRows.length}
            >
              <span className="material-symbols-outlined">today</span>
              <span id="btnFmsTodayLabel">{t("fmsToday", lang)}</span>
            </button>
            <div className="fms-date-picker-wrap">
              <label
                className="form-label"
                id="fmsDatePickerLabel"
                htmlFor="fmsDatePicker"
              >
                {t("fmsDate", lang)}
              </label>
              <input
                className="form-control"
                id="fmsDatePicker"
                type="date"
                min={dates[0] || ""}
                max={dates[dates.length - 1] || ""}
                value={selectedDate}
                disabled={!allRows.length}
                onChange={(e) => onSelectedDateChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="erp-table">
            <thead>
              <tr>
                <th>{t("fmsColAge", lang)}</th>
                <th>{t("fmsColDate", lang)}</th>
                <th>{t("fmsColFeedState", lang)}</th>
                <th>{t("fmsColMortEst", lang)}</th>
                <th>{t("fmsColPopulationEst", lang)}</th>
                <th>{t("fmsColFeedNameCode", lang)}</th>
                <th>{t("fmsColFeedConsumed", lang)}</th>
                <th>{t("fmsColStockLevelPct", lang)}</th>
                <th>{t("fmsColInventoryThreshold", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>
                    <div className="state-box">
                      <span className="material-symbols-outlined">
                        hourglass_top
                      </span>
                      <span>{t("msgLoadingDashboard", lang)}</span>
                    </div>
                  </td>
                </tr>
              ) : !flockFilter ? (
                <tr>
                  <td colSpan={9}>
                    <div className="state-box">
                      <span className="material-symbols-outlined">inbox</span>
                      <span>{t("fmsSelectFlockLog", lang)}</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="state-box">
                      <span className="material-symbols-outlined">inbox</span>
                      <span>{t("msgNoFmsData", lang)}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const rowDate = isoDate(row.date);
                  const isTodayRow = rowDate === today;
                  const isFocusedRow = selectedDate
                    ? rowDate === selectedDate
                    : isTodayRow;
                  const rowClasses = [];
                  if (isTodayRow) rowClasses.push("fms-row-today");
                  if (isFocusedRow) rowClasses.push("fms-row-focus");

                  return (
                    <tr
                      key={row.id || row.date}
                      className={rowClasses.join(" ")}
                    >
                      <td>{formatNumber(row.ngay_tuoi ?? row["Ngày Tuổi"])}</td>
                      <td>{formatDate(row.date, lang)}</td>
                      <td>
                        {formatFeedState(row.feed_state || row["FEED state"])}
                      </td>
                      <td>
                        <div className="fms-mort-cell">
                          <span>
                            {formatNumber(
                              String(row.feed_state || "").toLowerCase() ===
                                "actual"
                                ? (row.mort_act ?? row.MORT_act)
                                : (row.mort_est ?? row.MORT_est),
                            )}
                          </span>
                          <button
                            className="fms-mort-edit-btn"
                            type="button"
                            disabled={!canEditMort || rowDate > today}
                            onClick={() => onEditMort(row)}
                            title="Cập nhật lượng chết"
                            aria-label="Cập nhật lượng chết"
                          >
                            <span className="material-symbols-outlined">
                              edit
                            </span>
                          </button>
                        </div>
                      </td>
                      <td>
                        {formatNumber(
                          row.population_act ??
                            row.population_est ??
                            row.POPULATION_act ??
                            row.POPULATION_est,
                        )}
                      </td>
                      <td>{row.feed_name || row.FEED_NAME || "-"}</td>
                      <td>
                        {formatNumber(
                          row.feed_qty_est ?? row.FEED_QTY_USE_est,
                          3,
                        )}
                      </td>
                      <td>
                        {row.stock_level_percentage == null &&
                        row["Stock level percentage"] == null
                          ? "-"
                          : `${formatNumber(row.stock_level_percentage ?? row["Stock level percentage"], 2)}%`}
                      </td>
                      <td>
                        {renderStatusBadge(
                          row.inventory_thresholds ||
                            row["Inventory Thresholds"],
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="pagination-bar" style={{ padding: "10px 14px" }}>
            <div>
              Hiển thị{" "}
              <strong>
                {(page - 1) * 20 + 1} - {Math.min(page * 20, total)}
              </strong>{" "}
              / <strong>{total}</strong>
            </div>
            <div className="pagination-controls">
              <button
                className="page-btn"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                Trước
              </button>
              <span className="page-num">
                Trang {page} / {totalPages}
              </span>
              <button
                className="page-btn"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
