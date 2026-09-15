import { describe, expect, it } from "vitest";
import { FeedStandards } from "@/collections/FeedStandards";
import { FmsDailyLogs } from "@/collections/FmsDailyLogs";
import { Orders } from "@/collections/Orders";
import { PolicyThresholds } from "@/collections/PolicyThresholds";
import { TransferRequests } from "@/collections/TransferRequests";
import { WmsTransactions } from "@/collections/WmsTransactions";

type FieldConfig = {
  name?: string;
  required?: boolean;
  unique?: boolean;
  type?: string;
  admin?: { readOnly?: boolean };
};

const fieldsOf = (collection: { fields: unknown[] }): FieldConfig[] =>
  collection.fields.filter(
    (field): field is FieldConfig =>
      typeof field === "object" && field !== null && "name" in field,
  );

const fieldOf = (collection: { fields: unknown[] }, name: string) => {
  const field = fieldsOf(collection).find((candidate) => candidate.name === name);
  expect(field, `${name} field`).toBeDefined();
  return field as FieldConfig;
};

const runCreateHook = async (
  collection: { hooks?: { beforeValidate?: unknown[] } },
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const hook = collection.hooks?.beforeValidate?.[0];
  expect(typeof hook).toBe("function");
  const result = await (hook as (args: {
    data: Record<string, unknown>;
    operation: "create";
  }) => Promise<Record<string, unknown>> | Record<string, unknown>)({
    data,
    operation: "create",
  });
  return result;
};

describe("Phase 02 collection contracts", () => {
  it("keeps generated order and transfer IDs required, unique, and read-only", () => {
    for (const [collection, field] of [
      [Orders, "orderId"],
      [TransferRequests, "transferId"],
    ] as const) {
      const contract = fieldOf(collection, field);
      expect(contract.required).toBe(true);
      expect(contract.unique).toBe(true);
      expect(contract.admin?.readOnly).toBe(true);
    }
  });

  it("keeps append-only WMS and audit access policies", async () => {
    expect(WmsTransactions.access?.update?.({} as never)).toBe(false);
    expect(WmsTransactions.access?.delete?.({} as never)).toBe(false);

    const { AuditLogs } = await import("@/collections/AuditLogs");
    expect(AuditLogs.access?.update?.({} as never)).toBe(false);
    expect(AuditLogs.access?.delete?.({} as never)).toBe(false);
  });

  it("generates unique identifiers for feed, policy, and FMS records", async () => {
    const feed = await runCreateHook(FeedStandards, {});
    const threshold = await runCreateHook(PolicyThresholds, {});
    const log = await runCreateHook(FmsDailyLogs, {});

    expect(feed.standardId).toMatch(/^FST-[A-Z0-9]+-[A-Z0-9]+$/);
    expect(threshold.thresholdId).toMatch(/^POL-[A-Z0-9]+-[A-Z0-9]+$/);
    expect(log.logId).toMatch(/^FMS-[A-Z0-9]+-[A-Z0-9]+$/);
  });

  it("generates ORD and TRF identifiers on create", async () => {
    const order = await runCreateHook(Orders, { tenant: "WMS_1" });
    const transfer = await runCreateHook(TransferRequests, {});

    expect(order.orderId).toMatch(/^WMS_1-ORD-[A-Z0-9]+-[A-Z0-9]+$/);
    expect(transfer.transferId).toMatch(/^TRF-[A-Z0-9]+-[A-Z0-9]+$/);
  });

  it("marks generated Phase 02 fields as required", () => {
    for (const [collection, field] of [
      [FeedStandards, "standardId"],
      [PolicyThresholds, "thresholdId"],
      [FmsDailyLogs, "logId"],
    ] as const) {
      const contract = fieldOf(collection, field);
      expect(contract.type).toBe("text");
      expect(contract.required).toBe(true);
      expect(contract.unique).toBe(true);
      expect(contract.admin?.readOnly).toBe(true);
    }
  });
});
