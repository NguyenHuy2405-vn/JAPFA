import type { PayloadClient } from "@/repositories/payload.repository";
import type { AuthUser } from "@/server/http/api-error";
import { dateKey } from "@/utils/date";
import { buildForecastRows } from "@/domains/fms/feed-forecast";

export type GetFmsLogParams = {
  tenantId: string;
  flockId: string;
};

/** GET tab=fms — daily log rows re-projected with live mortality/feed forecast, plus summary + chart series. */
export async function getFmsLog(
  payload: PayloadClient,
  user: AuthUser,
  { tenantId, flockId }: GetFmsLogParams,
) {
  const result = await payload.find({
    collection: "fms-daily-logs",
    limit: 1000,
    pagination: false,
    depth: 1,
    sort: "date",
    user: user as never,
    overrideAccess: false,
  });

  let data: any[] = [];

  const today = dateKey(new Date());
  const firstLog = result.docs.find(
    (log: any) => String(log.flock?.flockId || log.flock) === flockId,
  ) as any;
  const chickenType = String(firstLog?.flock?.chickenType || "").trim();

  const feedStandards = chickenType
    ? (
        await payload.find({
          collection: "feed-standards",
          limit: 10000,
          pagination: false,
          depth: 0,
          user: user as never,
          overrideAccess: false,
        })
      ).docs
    : [];
  const policies = (
    await payload.find({
      collection: "policy-thresholds",
      limit: 1000,
      pagination: false,
      depth: 0,
      user: user as never,
      overrideAccess: false,
    })
  ).docs as any[];

  data = buildForecastRows({
    logs: result.docs as any[],
    tenantId,
    flockId,
    feedStandards: feedStandards as any[],
    policies,
    chickenType,
    today,
  });

  let summary = null;
  if (flockId && data.length) {
    const flockLog = result.docs.find(
      (log: any) => String(log.flock?.flockId || log.flock) === flockId,
    ) as any;
    const current: any =
      [...data].reverse().find((row: any) => dateKey(row.date) <= today) ||
      data[0];
    summary = {
      flock_id: flockId,
      tenant_id: current.tenant_id,
      chicken_type: flockLog?.flock?.chickenType || "",
      date: current.date,
      age_in_days: current.ngay_tuoi,
      feed_state: current.feed_state,
      population_act: current.population_act,
      population_est: current.population_est,
      mort_cumulative: data
        .filter((row) => String(row.feed_state).toLowerCase() === "actual")
        .reduce((sum, row) => sum + (Number(row.mort_act) || 0), 0),
      feed_name: current.feed_name,
      feed_end_qtty: current.feed_end_qtty,
      stock_level_percentage: current.stock_level_percentage,
      inventory_thresholds: current.inventory_thresholds,
    };
  }

  const chart = flockId
    ? data.map((row) => ({
        age: Number(row.ngay_tuoi),
        date: row.date,
        population_act:
          row.population_act != null &&
          Number.isFinite(Number(row.population_act)) &&
          Number(row.population_act) >= 0
            ? Number(row.population_act)
            : null,
        population_est:
          Number.isFinite(Number(row.population_est)) &&
          Number(row.population_est) >= 0
            ? Number(row.population_est)
            : null,
      }))
    : [];

  return { data, summary, chart };
}
