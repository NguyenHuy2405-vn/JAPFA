import { getPayload } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import Link from "next/link";

export default async function OperationDashboardPage() {
  const user = await getAppUser();
  if (!user) return null;

  const payload = await getPayload({ config });

  const [
    pendingOrders,
    inTransitOrders,
    pendingTransfers,
    unreadNotifications,
  ] = await Promise.all([
    payload.find({
      collection: "orders",
      limit: 0,
      depth: 0,
      where: { status: { equals: "SUBMITTED" } },
      overrideAccess: false,
      user: user!,
    }),
    payload.find({
      collection: "orders",
      limit: 0,
      depth: 0,
      where: { status: { equals: "IN_TRANSIT" } },
      overrideAccess: false,
      user: user!,
    }),
    payload.find({
      collection: "transfer-requests",
      limit: 0,
      depth: 0,
      where: { status: { equals: "SUBMITTED" } },
      overrideAccess: false,
      user: user!,
    }),
    payload.find({
      collection: "notifications",
      limit: 0,
      depth: 0,
      where: {
        and: [
          { recipient: { equals: user.id } },
          { isRead: { equals: false } },
        ],
      },
      overrideAccess: false,
      user,
    }),
  ]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink">
            Operation Dashboard
          </h1>
          <p className="text-sm text-ink-soft">
            Tổng quan các tác vụ xử lý cho OPERATION.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/operation/orders/pending"
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink hover:bg-background-soft"
          >
            Xử lý đơn hàng
          </Link>
          <Link
            href="/operation/transfers/pending"
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink hover:bg-background-soft"
          >
            Xử lý điều chuyển
          </Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-md border border-line bg-surface p-4 shadow-card">
          <p className="text-sm text-ink-soft">Orders chờ duyệt</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {pendingOrders.totalDocs}
          </p>
        </article>
        <article className="rounded-md border border-line bg-surface p-4 shadow-card">
          <p className="text-sm text-ink-soft">Orders đang vận chuyển</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {inTransitOrders.totalDocs}
          </p>
        </article>
        <article className="rounded-md border border-line bg-surface p-4 shadow-card">
          <p className="text-sm text-ink-soft">Transfers chờ duyệt</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {pendingTransfers.totalDocs}
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
