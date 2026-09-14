// Whitelisted reasons for a manual WMS "ADJUSTMENT" ledger entry (see adjust_wms action).
export const VALID_ADJUSTMENT_REASONS = new Set([
  "Kiểm kê định kỳ",
  "Hao hụt / Thất thoát",
  "Thất thoát",
  "Sai lệch dữ liệu nhập",
  "Sai lệch nhập liệu",
  "Lý do khác",
  "Khác",
]);
