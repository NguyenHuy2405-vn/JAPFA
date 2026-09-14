import { getPayload } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import { OperationOrdersClient } from "@/components/operation/OperationOrdersClient";

export default async function OperationOrdersInTransitPage() {
  const user = await getAppUser();
  if (!user) return null;

  const payload = await getPayload({ config });
  const orders = await payload.find({
    collection: "orders",
    limit: 100,
    sort: "-createdAt",
    depth: 1,
    where: { status: { equals: "IN_TRANSIT" } },
    overrideAccess: false,
    user,
  });

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ink">
          Đơn hàng đang vận chuyển
        </h1>
        <p className="text-sm text-ink-soft">
          {orders.totalDocs} đơn hàng đang ở trạng thái IN_TRANSIT.
        </p>
      </div>
      <OperationOrdersClient
        initialOrders={orders.docs as never[]}
        mode="in-transit"
      />
    </section>
  );
}
