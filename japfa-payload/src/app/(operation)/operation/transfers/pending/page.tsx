import { getPayload } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import { OperationTransfersClient } from "@/components/operation/OperationTransfersClient";

export default async function OperationTransfersPendingPage() {
  const user = await getAppUser();
  if (!user) return null;

  const payload = await getPayload({ config });
  const transfers = await payload.find({
    collection: "transfer-requests",
    limit: 100,
    sort: "-createdAt",
    depth: 1,
    where: { status: { equals: "SUBMITTED" } },
    overrideAccess: false,
    user,
  });

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ink">
          Lệnh điều chuyển chờ duyệt
        </h1>
        <p className="text-sm text-ink-soft">
          {transfers.totalDocs} lệnh đang chờ xử lý.
        </p>
      </div>
      <OperationTransfersClient
        initialTransfers={transfers.docs as never[]}
        mode="pending"
      />
    </section>
  );
}
