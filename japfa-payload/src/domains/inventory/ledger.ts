export type InventoryTransactionType =
  | "INBOUND"
  | "OUTBOUND"
  | "CONSUME"
  | "LOSS"
  | "REPORT"
  | "ADJUSTMENT";

export type LedgerAmounts = {
  quantity: number;
  beginQuantity: number;
  inQuantity: number;
  outQuantity: number;
  endQuantity: number;
};

export const calculateLedgerAmounts = ({
  beginQuantity,
  quantity,
  txnType,
  delta,
}: {
  beginQuantity: number;
  quantity: number;
  txnType: InventoryTransactionType;
  delta?: number;
}): LedgerAmounts => {
  if (!Number.isFinite(beginQuantity)) {
    throw new Error("Tồn kho đầu kỳ không hợp lệ.");
  }

  const effectiveQuantity =
    txnType === "ADJUSTMENT" ? Math.abs(delta || 0) : quantity;
  if (!Number.isFinite(effectiveQuantity) || effectiveQuantity <= 0) {
    throw new Error("Số lượng giao dịch phải lớn hơn 0.");
  }

  const isInbound =
    txnType === "INBOUND" || (txnType === "ADJUSTMENT" && (delta || 0) > 0);
  const isOutbound =
    ["OUTBOUND", "CONSUME", "LOSS"].includes(txnType) ||
    (txnType === "ADJUSTMENT" && (delta || 0) < 0);
  const inQuantity = isInbound ? effectiveQuantity : 0;
  const outQuantity = isOutbound ? effectiveQuantity : 0;
  const endQuantity = beginQuantity + inQuantity - outQuantity;

  if (endQuantity < 0 && txnType !== "ADJUSTMENT") {
    throw new Error("Tồn kho không đủ cho giao dịch xuất.");
  }

  return {
    quantity: effectiveQuantity,
    beginQuantity,
    inQuantity,
    outQuantity,
    endQuantity,
  };
};
