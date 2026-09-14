import type { FmsChartPoint, FmsLogRow, FmsSummary } from "@/types/fms.types";
import { getJson, postJson } from "@/services/api/http";

async function postAction(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<{ success: boolean; error?: string } & Record<string, unknown>> {
  return postJson("/api/japfa-data", {
    action,
    ...payload,
  }) as Promise<{ success: boolean; error?: string } & Record<string, unknown>>;
}

export async function fetchFmsLog(params: {
  tenantId: string;
  flockId: string;
}): Promise<{
  success: boolean;
  data?: FmsLogRow[];
  summary?: FmsSummary;
  chart?: FmsChartPoint[];
  error?: string;
}> {
  const query = new URLSearchParams({
    tab: "fms",
    tenantId: params.tenantId,
    flockId: params.flockId,
  });
  return getJson(`/api/japfa-data?${query.toString()}`) as Promise<{
    success: boolean;
    data?: FmsLogRow[];
    summary?: FmsSummary;
    chart?: FmsChartPoint[];
    error?: string;
  }>;
}

export const updateFmsMort = (flockId: string, date: string, mortAct: number) =>
  postAction("update_fms_mort", { flock_id: flockId, date, mort_act: mortAct });
