import type { Access, PayloadRequest } from "payload";
import { denyAll } from "@/access/deny-all";
import { authenticated } from "@/access/authenticated";

/**
 * Admin-only access helper for japfa-platform.
 * Phase này chỉ có ADMIN; không triển khai role phức tạp.
 */
export const adminOnly: Access = ({ req }) => {
  if (!req.user) return false;
  return req.user.role === "ADMIN";
};

export const adminAccess = ({ req }: { req: PayloadRequest }): boolean => {
  return !!req.user && req.user.role === "ADMIN";
};

export { authenticated, denyAll };

export const allowAll: Access = () => true;

export const systemOnly: Access = ({ req }) => {
  return req.context?.system === true;
};
