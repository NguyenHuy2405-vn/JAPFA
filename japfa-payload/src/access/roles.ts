/**
 * MIGRATION MARKER
 *
 * Legacy role aliases remain until the Phase 11 role consolidation migration
 * settles the database into the three canonical roles only.
 *
 * Keep compatibility for now; do not remove before migration is complete.
 */

import type { AuthUser, Role, TenantRef } from "@/types/auth.types";

export const ROLES = {
  ADMIN: "ADMIN",
  OPERATION: "OPERATION",
  FARM: "FARM",
} as const;

export type { Role };

const OPERATION_ALIASES = [
  ROLES.OPERATION,
  "PROCUREMENT",
  "INVENTORY",
  "OPS",
  "TECHNICAL",
] as const;

const FARM_ALIASES = [ROLES.FARM, "VIEWER"] as const;

const tenantIdFromRef = (tenant: TenantRef): string | number | undefined => {
  if (typeof tenant === "object" && tenant !== null) return tenant.id;
  return tenant;
};

const normalizeTenantIds = (
  value: AuthUser["tenantMemberships"] | AuthUser["tenants"],
): Array<string | number> =>
  (value || [])
    .map(tenantIdFromRef)
    .filter((id): id is string | number => id !== undefined && id !== null);

export function isAdmin(role?: string | null): boolean {
  return role === ROLES.ADMIN;
}

export function isOperation(role?: string | null): boolean {
  return Boolean(
    role && (OPERATION_ALIASES as readonly string[]).includes(role),
  );
}

export function isFarm(role?: string | null): boolean {
  return Boolean(role && (FARM_ALIASES as readonly string[]).includes(role));
}

export function isGlobalRole(role?: string | null): boolean {
  return isAdmin(role) || isOperation(role);
}

export function canCreateFarm(actorRole?: string | null): boolean {
  return isAdmin(actorRole);
}

export function canCreateUser(
  actorRole?: string | null,
  targetRole?: Role,
): boolean {
  if (!isAdmin(actorRole) || !targetRole) return false;
  return targetRole === ROLES.FARM || targetRole === ROLES.OPERATION;
}

export function canWriteWms(actorRole?: string | null): boolean {
  return isOperation(actorRole) || isFarm(actorRole);
}

export function canWriteFms(actorRole?: string | null): boolean {
  return isOperation(actorRole) || isFarm(actorRole);
}

export function canWriteOms(actorRole?: string | null): boolean {
  return isOperation(actorRole) || isFarm(actorRole);
}

export function canApproveTransfer(actorRole?: string | null): boolean {
  return isOperation(actorRole);
}

export function canReceiveTransfer(actorRole?: string | null): boolean {
  return isFarm(actorRole);
}

export function canReadCrossFarm(actorRole?: string | null): boolean {
  return isGlobalRole(actorRole);
}

export function canReadAudit(actorRole?: string | null): boolean {
  return isAdmin(actorRole);
}

export function userTenantIds(user?: AuthUser | null): Array<string | number> {
  if (!user) return [];
  const memberships = normalizeTenantIds(user.tenantMemberships);
  if (memberships.length) return memberships;
  return normalizeTenantIds(user.tenants);
}
