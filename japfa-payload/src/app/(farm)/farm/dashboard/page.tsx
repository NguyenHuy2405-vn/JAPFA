import { getPayload } from "payload";
import type { Where } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import Link from "next/link";

export default async function FarmDashboardPage() {
  const user = await getAppUser();
  if (!user) return null;

  const payload = await getPayload({ config });

  const tenantFilter: Where = {
    and: [{ recipient: { equals: user!.id } }, { isRead: { equals: false } }],
  };

  const [wmsRows, fmsRows, orderRows, unreadNotifications] = await Promise.all([
    payload.find({
      collection: "wms-transactions",
      limit: 0,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: "fms-daily-logs",
      limit: 0,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: "orders",
      limit: 0,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: "notifications",
      limit: 0,
      depth: 0,
      where: tenantFilter,
      overrideAccess: false,
      user,
    }),
  ]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink">
            Farm Dashboard
          </h1>
          <p className="text-sm text-ink-soft">
            Tổng quan vận hành theo farm của bạn.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/farm/orders"
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink hover:bg-background-soft"
          >
            Đơn hàng
          </Link>
          <Link
            href="/farm/transfers"
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink hover:bg-background-soft"
          >
            Điều chuyển
          </Link>
          <Link
            href="/farm/wms"
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink hover:bg-background-soft"
          >
            WMS
          </Link>
          <Link
            href="/farm/fms"
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink hover:bg-background-soft"
          >
            FMS
          </Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-md border border-line bg-surface p-4 shadow-card">
          <p className="text-sm text-ink-soft">WMS transactions</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {wmsRows.totalDocs}
          </p>
        </article>
        <article className="rounded-md border border-line bg-surface p-4 shadow-card">
          <p className="text-sm text-ink-soft">FMS daily logs</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {fmsRows.totalDocs}
          </p>
        </article>
        <article className="rounded-md border border-line bg-surface p-4 shadow-card">
          <p className="text-sm text-ink-soft">Orders trong phạm vi</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {orderRows.totalDocs}
          </p>
        </article>
        <article className="rounded-md border border-line bg-surface p-4 shadow-card">
          <p className="text-sm text-ink-soft">Thông báo chưa đọc</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {unreadNotifications.totalDocs}
          </p>
        </article>
      </div>
    </section>
  );
}
