import type { PayloadClient } from "@/repositories/payload.repository";
import { findOneByField } from "@/repositories/payload.repository";
import type { AuthUser } from "@/server/http/api-error";
import { dateKey } from "@/utils/date";

export type GetWmsInventoryParams = {
  scope: string;
  tenantId: string;
  flockId: string;
};

/** GET tab=wms — inventory ledger rows for Factory scope, or Farm scope + current stock summary. */
export async function getWmsInventory(
  payload: PayloadClient,
  user: AuthUser,
  { scope, tenantId, flockId }: GetWmsInventoryParams,
) {
  const filters: any[] = [
    { scope: { equals: scope === "farm" ? "FARM" : "FACTORY" } },
  ];
  if (tenantId) {
    const tenant = await findOneByField(
      payload,
      "tenants",
      "tenantId",
      tenantId,
      user,
    );
    if (!tenant) filters.push({ id: { equals: "__missing__" } });
    else filters.push({ tenant: { equals: tenant.id } });
  }
  if (flockId) {
    const flock = await findOneByField(
      payload,
      "flocks",
      "flockId",
      flockId,
      user,
    );
    if (!flock) filters.push({ id: { equals: "__missing__" } });
    else filters.push({ flock: { equals: flock.id } });
  }

  const result = await payload.find({
    collection: "wms-transactions",
    where: { and: filters },
    limit: 200,
    depth: 1,
    sort: "-date",
    user: user as never,
    overrideAccess: false,
  });

  if (scope === "factory") {
    return { scope: "factory" as const, data: result.docs, currentInfo: null };
  }

  let currentInfo = null;
  if (flockId) {
    const flock = await findOneByField(
      payload,
      "flocks",
      "flockId",
      flockId,
      user,
    );
    if (flock) {
      const logs = await payload.find({
        collection: "fms-daily-logs",
        where: { flock: { equals: flock.id } },
        limit: 1000,
        pagination: false,
        depth: 1,
        sort: "date",
        user: user as never,
        overrideAccess: false,
      });
      const rows = [...logs.docs].sort(
        (left: any, right: any) =>
          new Date(left.date).getTime() - new Date(right.date).getTime(),
      ) as any[];
      const today = new Date();
      const current =
        [...rows]
          .reverse()
          .find((row) => new Date(row.date).getTime() <= today.getTime()) ||
        rows[0];
      const depletedIndex = rows.findIndex((row) => {
        if (
          row.stockLevelPercentage === null ||
          row.stockLevelPercentage === undefined ||
          row.stockLevelPercentage === ""
        )
          return false;
        const percentage = Number(row.stockLevelPercentage);
        return Number.isFinite(percentage) && percentage <= 0;
      });
      const date1 = (result.docs as any[]).find(
        (transaction) => dateKey(transaction.date) < dateKey(today),
      )?.date;
      currentInfo = current
        ? {
            flockId,
            flockName: flock.flockName || "",
            feedName: current.feedProduct?.name || current.feedNameOrder || "",
            warningLabel: current.badgeStatus || "",
            currentInventory: Number(current.endQty) || 0,
            stockLevelPercentage: current.stockLevelPercentage,
            date1: date1 || null,
            date2: depletedIndex > 0 ? rows[depletedIndex - 1].date : null,
          }
        : null;
    }
  }

  return { scope: "farm" as const, data: result.docs, currentInfo };
}
