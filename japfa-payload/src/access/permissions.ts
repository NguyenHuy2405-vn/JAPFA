import type { Access, Where } from "payload";
import {
  canWriteFms,
  canWriteOms,
  canWriteWms,
  isAdmin,
  isFarm,
  isGlobalRole,
  isOperation,
  userTenantIds,
} from "@/access/roles";
import type { AuthUser } from "@/types/auth.types";

const asAuthUser = (user: unknown): AuthUser | undefined =>
  user ? (user as AuthUser) : undefined;

const tenantValue = (value: unknown) =>
  typeof value === "object" && value !== null
    ? (value as { id?: string | number }).id
    : value;

const farmOwnsAllPresentFields = (
  data: Record<string, unknown> | undefined,
  fields: string[],
  ids: Array<string | number>,
) =>
  fields.every((field) => {
    const value = tenantValue(data?.[field]);
    return value === undefined || value === null || ids.includes(value as never);
  });

const farmTenantWhere = (
  fields: string[],
  ids: Array<string | number>,
): Where => {
  if (fields.length === 1) {
    return { [fields[0]]: { in: ids } } as Where;
  }
  return {
    or: fields.map((field) => ({ [field]: { in: ids } })),
  } as Where;
};

const operationalWrite =
  (canWrite: (role?: string | null) => boolean, fields: string[]): Access =>
  ({ req, data, id }) => {
    const user = asAuthUser(req.user);
    if (!user || !canWrite(user.role)) return false;
    if (isOperation(user.role)) return true;
    const ids = userTenantIds(user);
    if (!ids.length) return false;
    if (!farmOwnsAllPresentFields(data, fields, ids)) return false;
    if (id === undefined || id === null) return true;
    return farmTenantWhere(fields, ids);
  };

export const allowAll: Access = () => true;

export const denyAll: Access = () => false;

export const authenticated: Access = ({ req }) => Boolean(req.user);

export { isAdmin };

export const adminOnly: Access = ({ req }) => isAdmin(asAuthUser(req.user)?.role);

export const operationsWrite = operationalWrite(canWriteFms, ["tenant"]);

export const omsTenantWrite = operationalWrite(canWriteOms, [
  "tenant",
  "origin",
  "destination",
]);

export const wmsTenantWrite = operationalWrite(canWriteWms, ["tenant"]);

export const fmsTenantWrite = operationalWrite(canWriteFms, ["tenant"]);

export const tenantScoped =
  (field = "tenant"): Access =>
  ({ req }) => {
    const user = asAuthUser(req.user);
    if (!user) return false;
    if (isGlobalRole(user.role)) return true;
    if (!isFarm(user.role)) return false;
    const ids = userTenantIds(user);
    if (!ids.length) return false;
    return { [field]: { in: ids } } as Where;
  };

export const crossFarmRead =
  (fields: string[]): Access =>
  ({ req }) => {
    const user = asAuthUser(req.user);
    if (!user) return false;
    if (isGlobalRole(user.role)) return true;
    if (!isFarm(user.role)) return false;
    const ids = userTenantIds(user);
    if (!ids.length) return false;
    return farmTenantWhere(fields, ids);
  };

export const orderReadScope: Access = crossFarmRead([
  "tenant",
  "origin",
  "destination",
]);

export const transferReadScope: Access = crossFarmRead([
  "fromTenant",
  "toTenant",
]);

export const tenantRecordScoped = tenantScoped("id");

const operationalRead: Access = ({ req }) => {
  const role = asAuthUser(req.user)?.role;
  return isAdmin(role) || isOperation(role) || isFarm(role);
};

const operationalRoleWrite: Access = ({ req }) => {
  const role = asAuthUser(req.user)?.role;
  return isOperation(role) || isFarm(role);
};

export const omsRead = operationalRead;
export const omsWrite = operationalRoleWrite;
export const wmsRead = operationalRead;
export const wmsWrite = operationalRoleWrite;
export const fmsRead = operationalRead;
export const fmsWrite = operationalRoleWrite;
