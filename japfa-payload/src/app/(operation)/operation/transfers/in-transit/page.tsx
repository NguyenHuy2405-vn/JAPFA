import { getPayload } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import { OperationTransfersClient } from "@/components/operation/OperationTransfersClient";

export default async function OperationTransfersInTransitPage() {
  const user = await getAppUser();
  if (!user) return null;

  const payload = await getPayload({ config });
  const transfers = await payload.find({
    collection: "transfer-requests",
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
          Lệnh điều chuyển đang vận chuyển
        </h1>
        <p className="text-sm text-ink-soft">
          {transfers.totalDocs} lệnh đang ở trạng thái IN_TRANSIT.
        </p>
      </div>
      <OperationTransfersClient
        initialTransfers={transfers.docs as never[]}
        mode="in-transit"
      />
    </section>
  );
}
