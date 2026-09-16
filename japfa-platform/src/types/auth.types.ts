export type Role = "ADMIN" | "OPERATION" | "FARM";

export type SessionPayload = {
  userId: string | number;
  authzVersion: number;
  expiresAt: number;
};

export type OrderStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "IN_TRANSIT"
  | "RECEIVED"
  | "COMPLETED"
  | "CANCELLED";

export type TransferStatus = OrderStatus;

export type AccountStatus = "ACTIVE" | "LOCKED";

export type TenantStatus = "ACTIVE" | "INACTIVE" | "LOCKED";

export type TenantRef = string | number | { id?: string | number };

export type AuthUser = {
  id?: string | number;
  email?: string | null;
  role?: string | null;
  tenants?: TenantRef[] | null;
  tenantMemberships?: TenantRef[] | null;
  primaryTenant?: TenantRef | null;
  accountStatus?: AccountStatus | null;
  authzVersion?: number | null;
  mustChangePassword?: boolean | null;
};
