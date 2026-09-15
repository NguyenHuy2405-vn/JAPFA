export const TRANSFER_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "IN_TRANSIT",
  "RECEIVED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

const validTransitions: Record<TransferStatus, TransferStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["IN_TRANSIT", "CANCELLED"],
  REJECTED: [],
  IN_TRANSIT: ["RECEIVED"],
  RECEIVED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const assertTransferTransition = (
  from: string,
  to: string,
  actorRole: string | undefined,
): void => {
  if (from === to) return;
  if (!TRANSFER_STATUSES.includes(from as TransferStatus)) {
    throw new Error(`INVALID_TRANSITION: unknown from status ${from}`);
  }
  if (!TRANSFER_STATUSES.includes(to as TransferStatus)) {
    throw new Error(`INVALID_TRANSITION: unknown to status ${to}`);
  }
  const allowed = validTransitions[from as TransferStatus] ?? [];
  if (!allowed.includes(to as TransferStatus)) {
    throw new Error(
      `INVALID_TRANSITION: ${from} -> ${to} is not allowed for role ${actorRole ?? "ADMIN"}`,
    );
  }
};
