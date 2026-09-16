export type WmsScope = "farm" | "factory";

export type WmsTransactionRow = {
  id: string | number;
  scope: "FARM" | "FACTORY";
  tenant: any;
  flock?: any;
  product: any;
  txnType: string;
  quantity: number;
  beginQuantity: number;
  inQuantity: number;
  outQuantity: number;
  endQuantity: number;
  order?: any;
  reason?: string;
  date: string;
  note?: string;
};

export type WmsCurrentInfo = {
  flockId: string;
  flockName: string;
  feedName: string;
  warningLabel: string;
  currentInventory: number;
  stockLevelPercentage: number | string | null;
  date1: string | null;
  date2: string | null;
} | null;

export type WmsTxnFormValues = {
  tenant_id: string;
  sku: string;
  flock_id: string;
  so_luong: number;
  from_location: string;
  to_location: string;
  note: string;
};

export type WmsAdjustFormValues = {
  tenant_id: string;
  sku: string;
  flock_id: string;
  delta: number;
  reason: string;
  note: string;
};

export type FarmOrderFormValues = {
  storage_days: string;
  packaging_sku: string;
  tenant_id: string;
  client: string;
  quantity: number;
  uom: string;
  origin: string;
  destination: string;
  expected_delivery_date: string;
  note: string;
};

export type FarmOrderSuggestData = {
  flockId: string;
  flockName: string;
  flockGroup: string;
  tenantId: string;
  farmName: string;
  managedBy: string;
  feedName: string;
  date2: string;
  referenceDate: string;
  projectedEndQtyKg: number;
  suggestedQtyKg: number;
  isEnoughUntilRefDate: boolean;
  storageDays: number;
  packages: Array<{ sku: string; uom: string; uomWeightKg: number }>;
  packageData?: {
    packagingSku: string;
    uom: string;
    uomWeightKg: number;
    suggestedQtyKg: number;
    suggestedBags: number;
  };
};
