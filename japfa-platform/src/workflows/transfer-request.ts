import type { CollectionAfterChangeHook } from "payload";
import {
  assertTransferTransition,
  type TransferStatus,
} from "@/domains/transfers/state-machine";
import { writeAudit } from "@/services/audit/audit.service";
import { queueAfterCommit } from "@/services/jobs/queue.service";

const relationId = (value: unknown): string | number | undefined =>
  typeof value === "object" && value !== null
    ? ((value as { id?: string | number; value?: string | number }).id ??
      (value as { value?: string | number }).value)
    : (value as string | number | undefined);

export const transferWorkflow: CollectionAfterChangeHook = async ({
  req,
  doc,
  previousDoc,
}) => {
  if (!previousDoc || doc.status === previousDoc.status) return;

  assertTransferTransition(
    String(previousDoc.status) as TransferStatus,
    String(doc.status) as TransferStatus,
    req.user?.role,
  );

  const isApproved = doc.status === "APPROVED";
  const isReceived = doc.status === "RECEIVED";
  if (isApproved || isReceived) {
    await req.payload.create({
      req,
      collection: "wms-transactions",
      data: {
        scope: isApproved ? "FACTORY" : "FARM",
        tenant: relationId(isApproved ? doc.fromTenant : doc.toTenant),
        flock: isReceived ? relationId(doc.flock) : undefined,
        product: relationId(doc.product),
        txnType: isApproved ? "OUTBOUND" : "INBOUND",
        quantity: doc.quantity,
        date: new Date().toISOString(),
        beginQuantity: 0,
        inQuantity: isReceived ? doc.quantity : 0,
        outQuantity: isApproved ? doc.quantity : 0,
        endQuantity: isReceived ? doc.quantity : -Number(doc.quantity),
        note: `Transfer ${doc.transferId} ${doc.status}`,
      } as never,
      overrideAccess: true,
    });
  }

  if (req.user) {
    await writeAudit(
      req.payload,
      {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action:
          doc.status === "APPROVED"
            ? "TRANSFER_APPROVED"
            : doc.status === "RECEIVED"
              ? "TRANSFER_RECEIVED"
              : "TRANSFER_REJECTED",
        targetCollection: "transfer-requests",
        targetId: doc.id,
        before: { status: previousDoc.status },
        after: { status: doc.status },
      },
      req,
    );
  }

  await queueAfterCommit(
    req,
    "sendTransferNotification",
    { transferId: String(doc.id), newStatus: String(doc.status) },
    "notifications",
  );
};
