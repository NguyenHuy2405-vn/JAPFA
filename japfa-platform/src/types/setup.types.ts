export type SetupSection =
  | "account"
  | "product"
  | "feed"
  | "policy"
  | "standard";

export type SetupProductForm = {
  sku: string;
  ten_hang_hoa: string;
  loai_san_pham: string;
  uom: string;
  uom_weight_kg: number;
  status: string;
};

export type SetupPolicyForm = {
  ma_hang: string;
  zero_threshold: number;
  critical_threshold: number;
  low_threshold: number;
  high_threshold: number;
  status: string;
  note: string;
};
