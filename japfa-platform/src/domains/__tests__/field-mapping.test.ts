import { describe, expect, it } from "vitest";
import { toFmsCanonical } from "@/domains/fms/mapper";
import { toNotificationCanonical } from "@/domains/notifications/mapper";
import { toProductCanonical } from "@/domains/products/mapper";
import { toTenantCanonical } from "@/domains/tenants/mapper";

const base = {
  id: 1,
  updatedAt: "2026-09-15T00:00:00.000Z",
  createdAt: "2026-09-15T00:00:00.000Z",
};

describe("field mapping", () => {
  it("maps production tenant type to canonical tenantType", () => {
    const canonical = toTenantCanonical({
      ...base,
      farmCode: "FARM-A",
      tenantId: "TEN-1",
      name: "Farm A",
      type: "FARM",
      status: "ACTIVE",
    });
    expect(canonical.tenantType).toBe("FARM");
  });

  it("maps production productType to canonical category", () => {
    const canonical = toProductCanonical({
      ...base,
      sku: "SKU-1",
      name: "Feed",
      productType: "FEED",
      uom: "KG",
      uomWeightKg: 1,
    });
    expect(canonical.category).toBe("FEED");
  });

  it("maps notification message and recipient to canonical names", () => {
    const canonical = toNotificationCanonical({
      ...base,
      recipient: 7,
      type: "ORDER_APPROVED",
      title: "Approved",
      message: "Order approved",
    });
    expect(canonical.content).toBe("Order approved");
    expect(canonical.targetUser).toBe(7);
  });

  it("maps FMS production fields to canonical fields", () => {
    const canonical = toFmsCanonical({
      ...base,
      tenant: 1,
      flock: 2,
      date: "2026-09-15T00:00:00.000Z",
      ageInDays: 10,
      endQty: 42,
      feedQtyAct: 12,
      mortAct: 1,
      logId: "FMS-1",
    });
    expect(canonical).toEqual({
      feedConsumed: 12,
      mortality: 1,
      avgWeight: 42,
    });
  });
});
