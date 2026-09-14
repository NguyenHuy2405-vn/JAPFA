// Pure, side-effect-free feed/population forecast math extracted from the old
// GET tab=fms handler. Keeping this framework-agnostic makes it unit-testable
// without spinning up Payload/Postgres.

export type PolicyThresholdRow = {
  sku?: unknown;
  zeroThreshold?: unknown;
  criticalStockThreshold?: unknown;
  lowStockThreshold?: unknown;
  highThreshold?: unknown;
};

export type FeedStandardRow = {
  chickenType?: unknown;
  ageInDays?: unknown;
  feedName?: unknown;
  feedQtyPerBirdPerDay?: unknown;
};

export type ForecastRow = {
  id: unknown;
  tenant_id: unknown;
  flock_id: unknown;
  date: unknown;
  ngay_tuoi: unknown;
  population_act: unknown;
  mort_act: unknown;
  mort_est: unknown;
  population_est: unknown;
  feed_state: unknown;
  feed_name: unknown;
  feed_qty_est: unknown;
  feed_end_qtty: unknown;
  stock_level_percentage: unknown;
  inventory_thresholds: unknown;
  badgeStatus: unknown;
};

type BuildForecastRowsParams = {
  logs: any[];
  tenantId?: string;
  flockId?: string;
  chickenType: string;
  feedStandards: FeedStandardRow[];
  policies: PolicyThresholdRow[];
  today: string;
};

const toForecastRow = (log: any): ForecastRow => ({
  id: log.id,
  tenant_id: log.tenant?.tenantId || log.tenant,
  flock_id: log.flock?.flockId || log.flock,
  date: log.date,
  ngay_tuoi: log.ageInDays,
  population_act:
    String(log.feedState || "").toLowerCase() === "actual"
      ? log.birdCount == null || log.birdCount === ""
        ? null
        : log.birdCount
      : null,
  mort_act: log.mortAct,
  mort_est: log.mortEst,
  population_est: log.populationEst,
  feed_state: log.feedState,
  feed_name: log.feedProduct?.name || log.feedProduct,
  feed_qty_est: log.feedQtyEst,
  feed_end_qtty: log.endQty,
  stock_level_percentage: log.stockLevelPercentage,
  inventory_thresholds: log.badgeStatus,
  badgeStatus: log.badgeStatus,
});

const inAllowedAgeRange = (value: unknown) => {
  const age = Number(value);
  return Number.isFinite(age) && age >= 0 && age <= 125;
};

const matchesScope = (
  row: ForecastRow,
  tenantId: string | undefined,
  flockId: string | undefined,
) =>
  (!tenantId || String(row.tenant_id || "") === tenantId) &&
  (!flockId || String(row.flock_id || "") === flockId);

export const buildForecastRows = ({
  logs,
  tenantId,
  flockId,
  chickenType,
  feedStandards,
  policies,
  today,
}: BuildForecastRowsParams): ForecastRow[] => {
  const baseRows = logs
    .map(toForecastRow)
    .filter((row) => matchesScope(row, tenantId, flockId))
    .filter((row) => inAllowedAgeRange(row.ngay_tuoi))
    .sort(
      (left, right) =>
        Number(left.ngay_tuoi) - Number(right.ngay_tuoi) ||
        new Date(String(left.date)).getTime() -
          new Date(String(right.date)).getTime(),
    );

  return applyFeedForecast(baseRows as any[], {
    feedStandards,
    policies,
    chickenType,
    today,
  }) as ForecastRow[];
};

/** Resolves the inventory warning badge for a SKU given its stock-level percentage. */
export const resolveBadge = (
  policies: PolicyThresholdRow[],
  sku: unknown,
  percentage: number,
) => {
  const policy = policies.find(
    (item) => String(item.sku || "").trim() === String(sku || "").trim(),
  );
  if (!policy || !Number.isFinite(percentage)) return "NORMAL";
  const zero = Number(policy.zeroThreshold);
  const critical = Number(policy.criticalStockThreshold);
  const low = Number(policy.lowStockThreshold);
  const high = Number(policy.highThreshold);
  if (Number.isFinite(zero) && percentage <= zero) return "ZERO";
  if (Number.isFinite(critical) && percentage <= critical) return "CRITICAL";
  if (Number.isFinite(low) && percentage <= low) return "LOW";
  if (Number.isFinite(high) && percentage >= high) return "HIGH";
  return "SAFE";
};

/**
 * Re-projects population/feed-stock rows day-by-day using actual mortality
 * (when recorded) and the matching feed standard, exactly as the legacy
 * Apps Script forecast did. `data` rows must already be sorted by age/date.
 */
export function applyFeedForecast(
  data: any[],
  params: {
    feedStandards: FeedStandardRow[];
    policies: PolicyThresholdRow[];
    chickenType: string;
    today: string;
  },
) {
  const { feedStandards, policies, chickenType, today } = params;
  let runningPopulation: number | null = null;
  let cumulativeFeedDelta = 0;

  return data.map((row: any, index: number) => {
    const state = String(row.feed_state || "").toLowerCase();
    const rowDate = String(
      row.date ? new Date(row.date).toISOString().slice(0, 10) : "",
    );
    const previous = index > 0 ? data[index - 1] : null;
    const previousPopulation = previous
      ? Number(previous.population_act ?? previous.population_est)
      : Number.NaN;

    if (state === "actual") {
      const storedPopulation = Number(row.population_act);
      const mortality = Number(row.mort_act);
      const hasMortality =
        row.mort_act !== null &&
        row.mort_act !== undefined &&
        row.mort_act !== "";
      const populationBeforeMortality = Number.isFinite(runningPopulation)
        ? runningPopulation
        : Number.isFinite(previousPopulation)
          ? previousPopulation
          : storedPopulation;
      const adjustedPopulation =
        hasMortality &&
        Number.isFinite(populationBeforeMortality) &&
        Number.isFinite(mortality)
          ? (populationBeforeMortality as number) - mortality
          : storedPopulation;
      runningPopulation = Number.isFinite(adjustedPopulation)
        ? adjustedPopulation
        : null;
      const populationForFeed = Number.isFinite(runningPopulation)
        ? (runningPopulation as number)
        : storedPopulation;
      const standard = feedStandards.find(
        (item) =>
          String(item.chickenType || "").trim() === chickenType &&
          Number(item.ageInDays) === Number(row.ngay_tuoi) &&
          (!row.feed_name ||
            !item.feedName ||
            String(item.feedName).trim() === String(row.feed_name).trim()),
      );
      const dynamicFeedQty = standard
        ? (populationForFeed * Number(standard.feedQtyPerBirdPerDay || 0)) /
          1000
        : Number(row.feed_qty_est);
      const baselineFeedQty = Number(row.feed_qty_est);
      if (Number.isFinite(baselineFeedQty)) {
        cumulativeFeedDelta += baselineFeedQty - dynamicFeedQty;
      }
      return {
        ...row,
        population_act: runningPopulation,
        feed_qty_est: dynamicFeedQty,
        feed_end_qtty: Number(row.feed_end_qtty) + cumulativeFeedDelta,
        stock_level_percentage:
          dynamicFeedQty > 0
            ? ((Number(row.feed_end_qtty) + cumulativeFeedDelta) /
                dynamicFeedQty) *
              100
            : row.stock_level_percentage,
        inventory_thresholds: resolveBadge(
          policies,
          row.feed_name,
          dynamicFeedQty > 0
            ? ((Number(row.feed_end_qtty) + cumulativeFeedDelta) /
                dynamicFeedQty) *
                100
            : Number(row.stock_level_percentage),
        ),
        feed_state: row.feed_state,
      };
    }

    const storedEstimate = Number(row.population_est);
    const previousStoredEstimate =
      index > 0 ? Number(data[index - 1].population_est) : Number.NaN;
    const inferredMortality =
      Number.isFinite(previousStoredEstimate) &&
      Number.isFinite(storedEstimate) &&
      previousStoredEstimate > storedEstimate
        ? previousStoredEstimate - storedEstimate
        : 0;
    const dailyMortality = Number.isFinite(Number(row.mort_est))
      ? Number(row.mort_est)
      : inferredMortality;
    const nextPopulation = Number.isFinite(runningPopulation)
      ? (runningPopulation as number) - dailyMortality
      : storedEstimate;
    runningPopulation = Number.isFinite(nextPopulation) ? nextPopulation : null;
    const populationForFeed = Number.isFinite(runningPopulation)
      ? (runningPopulation as number)
      : storedEstimate;
    const standard = feedStandards.find(
      (item) =>
        String(item.chickenType || "").trim() === chickenType &&
        Number(item.ageInDays) === Number(row.ngay_tuoi) &&
        (!row.feed_name ||
          !item.feedName ||
          String(item.feedName).trim() === String(row.feed_name).trim()),
    );
    const dynamicFeedQty = standard
      ? (populationForFeed * Number(standard.feedQtyPerBirdPerDay || 0)) / 1000
      : Number(row.feed_qty_est);
    const baselineFeedQty = Number(row.feed_qty_est);
    if (Number.isFinite(baselineFeedQty) && Number.isFinite(dynamicFeedQty)) {
      cumulativeFeedDelta += baselineFeedQty - dynamicFeedQty;
    }
    const dynamicEndQty = Number(row.feed_end_qtty) + cumulativeFeedDelta;
    return {
      ...row,
      population_act: null,
      population_est: runningPopulation,
      feed_qty_est: dynamicFeedQty,
      feed_end_qtty: dynamicEndQty,
      stock_level_percentage:
        dynamicFeedQty > 0
          ? (dynamicEndQty / dynamicFeedQty) * 100
          : row.stock_level_percentage,
      inventory_thresholds: resolveBadge(
        policies,
        row.feed_name,
        dynamicFeedQty > 0
          ? (dynamicEndQty / dynamicFeedQty) * 100
          : Number(row.stock_level_percentage),
      ),
      feed_state:
        rowDate < today && state === "forecast" ? "estimate" : row.feed_state,
    };
  });
}
