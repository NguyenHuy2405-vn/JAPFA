import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";

export default async function AdminDashboardPage() {
  const user = await getAppUser();
  const payload = await getPayload({ config });

  const [tenants, users, pendingOrders, pendingTransfers] = await Promise.all([
    payload.find({
      collection: "tenants",
      limit: 0,
      depth: 0,
      overrideAccess: false,
      user: user!,
    }),
    payload.find({
      collection: "users",
      limit: 0,
      depth: 0,
      overrideAccess: false,
      user: user!,
    }),
    payload.find({
      collection: "orders",
      limit: 0,
      depth: 0,
      where: { status: { equals: "SUBMITTED" } },
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
  ]);

  return (
    <section className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold text-ink">
        Admin Dashboard
      </h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-md border border-line bg-surface p-4 shadow-card">
          <p className="text-sm text-ink-soft">Tổng farms</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {tenants.totalDocs}
          </p>
        </article>
        <article className="rounded-md border border-line bg-surface p-4 shadow-card">
          <p className="text-sm text-ink-soft">Tổng users</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {users.totalDocs}
          </p>
        </article>
        <article className="rounded-md border border-line bg-surface p-4 shadow-card">
          <p className="text-sm text-ink-soft">Orders chờ duyệt</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {pendingOrders.totalDocs}
          </p>
        </article>
        <article className="rounded-md border border-line bg-surface p-4 shadow-card">
          <p className="text-sm text-ink-soft">Transfers chờ duyệt</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {pendingTransfers.totalDocs}
          </p>
        </article>
      </div>
      <div className="rounded-md border border-line bg-surface p-4 shadow-card">
        <p className="text-sm text-ink-soft">Legacy fallback</p>
        <Link
          href="/admin/legacy-dashboard"
          className="mt-2 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover"
        >
          Mở Legacy Dashboard
        </Link>
      </div>
    </section>
  );
}
