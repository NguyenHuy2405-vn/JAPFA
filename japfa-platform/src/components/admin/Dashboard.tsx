import React from "react";
import type { AdminViewServerProps } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { StatsWidget } from "./widgets/StatsWidget";
import { OrdersPendingWidget } from "./widgets/OrdersPendingWidget";
import { RecentAuditWidget } from "./widgets/RecentAuditWidget";

export default async function Dashboard({
  initPageResult: _initPageResult,
}: AdminViewServerProps) {
  const payload = await getPayload({ config });

  const [farmsCount, usersCount, ordersCount] = await Promise.all([
    payload.count({ collection: "tenants", overrideAccess: true }),
    payload.count({ collection: "users", overrideAccess: true }),
    payload.count({
      collection: "orders",
      where: { status: { equals: "SUBMITTED" } },
      overrideAccess: true,
    }),
  ]);

  return (
    <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
      <StatsWidget
        stats={{
          farms: farmsCount.totalDocs,
          users: usersCount.totalDocs,
          ordersPending: ordersCount.totalDocs,
        }}
      />
      <OrdersPendingWidget />
      <RecentAuditWidget />
    </div>
  );
}
