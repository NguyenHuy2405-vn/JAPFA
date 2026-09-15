export const ORDER_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "IN_TRANSIT",
  "RECEIVED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["IN_TRANSIT", "CANCELLED"],
  REJECTED: [],
  IN_TRANSIT: ["RECEIVED"],
  RECEIVED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const assertOrderTransition = (
  from: string,
  to: string,
  actorRole: string | undefined,
): void => {
  if (from === to) return;
  if (!ORDER_STATUSES.includes(from as OrderStatus)) {
    throw new Error(`INVALID_TRANSITION: unknown from status ${from}`);
  }
  if (!ORDER_STATUSES.includes(to as OrderStatus)) {
    throw new Error(`INVALID_TRANSITION: unknown to status ${to}`);
  }
  const allowed = validTransitions[from as OrderStatus] ?? [];
  if (!allowed.includes(to as OrderStatus)) {
    throw new Error(
      `INVALID_TRANSITION: ${from} -> ${to} is not allowed for role ${actorRole ?? "ADMIN"}`,
    );
  }
};
