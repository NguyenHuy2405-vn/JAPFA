/**
 * @deprecated Legacy hook for LegacyDashboardView.
 * Will be removed in Phase 11.
 */

import { useRef, useState } from "react";
import {
  fetchFmsLog,
  updateFmsMort as updateFmsMortRequest,
} from "@/services/api/fms.api";
import type { FmsChartPoint, FmsLogRow, FmsSummary } from "@/types/fms.types";
import { dateKey } from "@/utils/date";

export type UseFmsLogParams = {
  pageSize: number;
  onError: (message: string) => void;
};

/** Encapsulates state + network calls for the FMS tab (daily log list, chart, summary, mortality edit modal). */
export function useFmsLog({ pageSize, onError }: UseFmsLogParams) {
  const [rows, setRows] = useState<FmsLogRow[]>([]);
  const [tenantFilter, setTenantFilter] = useState("");
  const [flockFilter, setFlockFilter] = useState("");
  const [summary, setSummary] = useState<FmsSummary>(null);
  const [chart, setChart] = useState<FmsChartPoint[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [mortRow, setMortRow] = useState<any>(null);
  const [mortValue, setMortValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const requestRef = useRef(0);

  const refetch = async () => {
    const requestId = ++requestRef.current;
    onError("");
    setLoading(true);
    try {
      const json = await fetchFmsLog({
        tenantId: tenantFilter,
        flockId: flockFilter,
      });
      if (requestId !== requestRef.current) return;
      if (json.success) {
        const nextRows = json.data || [];
        setRows(nextRows);
        setSummary(json.summary || null);
        setChart(json.chart || []);
        const today = dateKey(new Date());
        const targetIndex = Math.max(
          0,
          nextRows.findLastIndex((row) => dateKey(row.date) <= today),
        );
        setSelectedDate(dateKey(nextRows[targetIndex]?.date));
        setPage(Math.floor(targetIndex / pageSize) + 1);
      } else {
        onError(json.error || "Không thể tải dữ liệu FMS.");
      }
    } catch {
      if (requestId !== requestRef.current) return;
      onError("Không thể kết nối tới dịch vụ FMS.");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  };

  const changeFlockFilter = (flockId: string, tenantId: string) => {
    setTenantFilter(tenantId);
    setFlockFilter(flockId);
    setRows([]);
    setSummary(null);
    setChart([]);
  };

  const changeTenantFilter = (tenantId: string) => {
    setTenantFilter(tenantId);
    setFlockFilter("");
    setRows([]);
    setSummary(null);
    setChart([]);
  };

  const resetFilters = () => {
    setTenantFilter("");
    setFlockFilter("");
    setRows([]);
    setSummary(null);
    setChart([]);
    setSelectedDate("");
    setPage(1);
  };

  const changeSelectedDate = (value: string) => {
    setSelectedDate(value);
    const index = rows.findIndex((row) => dateKey(row.date) === value);
    if (index >= 0) setPage(Math.floor(index / pageSize) + 1);
  };

  const goToToday = () => {
    const today = dateKey(new Date());
    const index = Math.max(
      0,
      rows.findLastIndex((row) => dateKey(row.date) <= today),
    );
    setSelectedDate(dateKey(rows[index]?.date) || today);
    setPage(Math.floor(index / pageSize) + 1);
  };

  const openMortModal = (row: any) => {
    if (dateKey(row.date) > dateKey(new Date())) {
      onError("Chỉ được cập nhật số liệu cho ngày đã diễn ra hoặc hôm nay.");
      return;
    }
    setMortRow(row);
    setMortValue(Number(row.mort_act) || 0);
  };

  const submitMortForm = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await updateFmsMortRequest(
      mortRow.flock_id,
      mortRow.date,
      mortValue,
    );
    if (!result.success) {
      onError((result as any).error || "Không thể cập nhật số lượng chết.");
      return;
    }
    setMortRow(null);
    await refetch();
  };

  return {
    rows,
    tenantFilter,
    flockFilter,
    summary,
    chart,
    selectedDate,
    loading,
    page,
    setPage,
    refetch,
    changeFlockFilter,
    changeTenantFilter,
    resetFilters,
    changeSelectedDate,
    goToToday,

    mortRow,
    mortValue,
    setMortValue,
    openMortModal,
    closeMortModal: () => setMortRow(null),
    submitMortForm,
  };
}
