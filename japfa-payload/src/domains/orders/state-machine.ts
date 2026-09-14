export const ORDER_STATUS_RANK = {
  DRAFT: 1,
  SUBMITTED: 2,
  APPROVED: 3,
  IN_TRANSIT: 4,
  RECEIVED: 5,
  COMPLETED: 6,
  REJECTED: 99,
  CANCELLED: 99,
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS_RANK;

export const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === "string" && value in ORDER_STATUS_RANK;

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "REJECTED"],
  APPROVED: ["IN_TRANSIT"],
  IN_TRANSIT: ["RECEIVED"],
  RECEIVED: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export const canTransitionOrderStatus = (
  current: unknown,
  next: unknown,
): next is OrderStatus => {
  if (!isOrderStatus(current) || !isOrderStatus(next)) return false;
  return VALID_TRANSITIONS[current].includes(next);
};

export const statusReached = (status: unknown, target: OrderStatus) =>
  isOrderStatus(status) &&
  ORDER_STATUS_RANK[status] >= ORDER_STATUS_RANK[target];

export const ACTOR_ALLOWED_TRANSITIONS: Record<
  OrderStatus,
  Partial<Record<OrderStatus, string[]>>
> = {
  DRAFT: {
    SUBMITTED: ["FARM"],
    CANCELLED: ["FARM"],
  },
  SUBMITTED: {
    APPROVED: ["OPERATION"],
    REJECTED: ["OPERATION"],
  },
  APPROVED: {
    IN_TRANSIT: ["OPERATION", "SYSTEM"],
  },
  IN_TRANSIT: {
    RECEIVED: ["FARM"],
  },
  RECEIVED: {
    COMPLETED: ["OPERATION"],
  },
  COMPLETED: {},
  REJECTED: {},
  CANCELLED: {},
};

export function assertTransition(
  from: OrderStatus,
  to: OrderStatus,
  actorRole: string,
): void {
  if (!canTransitionOrderStatus(from, to)) {
    throw new Error(
      `INVALID_TRANSITION: Không thể chuyển từ ${from} sang ${to}`,
    );
  }
  const allowedRoles = ACTOR_ALLOWED_TRANSITIONS[from]?.[to] ?? [];
  // SYSTEM là wildcard cho auto transition
  if (!allowedRoles.includes("SYSTEM") && !allowedRoles.includes(actorRole)) {
    throw new Error(
      `FORBIDDEN: ${actorRole} không được chuyển ${from} → ${to}`,
    );
  }
}


