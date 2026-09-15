import { describe, expect, it } from "vitest";
import { adminOnly } from "@/access/admin-only";
import { authenticated } from "@/access/authenticated";
import { denyAll } from "@/access/deny-all";
import { operatorOrAdmin } from "@/access/operator-or-admin";
import { AuditLogs } from "@/collections/AuditLogs";
import { FmsDailyLogs } from "@/collections/FmsDailyLogs";
import { Orders } from "@/collections/Orders";
import { WmsTransactions } from "@/collections/WmsTransactions";

type AccessFunction = (args: never) => boolean;

const accessArgs = (role?: string) =>
  ({
    req: {
      user: role ? { role } : null,
    },
  }) as Parameters<typeof adminOnly>[0];

const evaluate = (value: unknown): boolean => {
  if (typeof value !== "function") return Boolean(value);
  return (value as AccessFunction)({} as never);
};

describe("access control", () => {
  it("allows ADMIN and blocks non-admin users", () => {
    expect(adminOnly(accessArgs("ADMIN"))).toBe(true);
    expect(adminOnly(accessArgs("OPERATION"))).toBe(false);
    expect(adminOnly(accessArgs("FARM"))).toBe(false);
    expect(adminOnly(accessArgs())).toBe(false);
  });

  it("allows ADMIN and OPERATOR to create orders", () => {
    expect(operatorOrAdmin(accessArgs("ADMIN"))).toBe(true);
    expect(operatorOrAdmin(accessArgs("OPERATOR"))).toBe(true);
    expect(operatorOrAdmin(accessArgs("FARM"))).toBe(false);
    expect(Orders.access?.create?.(accessArgs("OPERATOR"))).toBe(true);
  });

  it("allows FARM to create FMS logs but not admin-only dashboard access", () => {
    expect(FmsDailyLogs.access?.create?.(accessArgs("FARM"))).toBe(true);
    expect(adminOnly(accessArgs("FARM"))).toBe(false);
  });

  it("allows any authenticated user only for authenticated access", () => {
    expect(authenticated(accessArgs("ADMIN"))).toBe(true);
    expect(authenticated(accessArgs("FARM"))).toBe(true);
    expect(authenticated(accessArgs())).toBe(false);
  });

  it("always denies denyAll", () => {
    expect(denyAll({} as never)).toBe(false);
  });

  it("denies WMS transaction update and delete", () => {
    expect(evaluate(WmsTransactions.access?.update)).toBe(false);
    expect(evaluate(WmsTransactions.access?.delete)).toBe(false);
  });

  it("denies AuditLogs update and delete", () => {
    expect(evaluate(AuditLogs.access?.update)).toBe(false);
    expect(evaluate(AuditLogs.access?.delete)).toBe(false);
  });
});
