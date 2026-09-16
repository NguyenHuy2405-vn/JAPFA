export type FmsLogRow = {
  id: string | number;
  tenant_id: string;
  flock_id: string;
  date: string;
  ngay_tuoi: number;
  population_act: number | null;
  mort_act: number | null;
  mort_est: number | null;
  population_est: number | null;
  feed_state: string;
  feed_name: string;
  feed_qty_est: number;
  feed_end_qtty: number;
  stock_level_percentage: number | string | null;
  inventory_thresholds: string;
  badgeStatus: string;
};

export type FmsSummary = {
  flock_id: string;
  tenant_id: string;
  chicken_type: string;
  date: string;
  age_in_days: number;
  feed_state: string;
  population_act: number | null;
  population_est: number | null;
  mort_cumulative: number;
  feed_name: string;
  feed_end_qtty: number;
  stock_level_percentage: number | string | null;
  inventory_thresholds: string;
} | null;

export type FmsChartPoint = {
  age: number;
  date: string;
  population_act: number | null;
  population_est: number | null;
};
