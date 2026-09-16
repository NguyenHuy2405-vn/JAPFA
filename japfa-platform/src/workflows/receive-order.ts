import type { CollectionAfterChangeHook } from "payload";
import {
  assertOrderTransition,
  type OrderStatus,
} from "@/domains/orders/state-machine";
import { writeAudit } from "@/services/audit/audit.service";
import { queueAfterCommit } from "@/services/jobs/queue.service";

const relationId = (value: unknown): string | number | undefined =>
  typeof value === "object" && value !== null
    ? ((value as { id?: string | number; value?: string | number }).id ??
      (value as { value?: string | number }).value)
    : (value as string | number | undefined);

export const receiveOrderWorkflow: CollectionAfterChangeHook = async ({
  req,
  doc,
  previousDoc,
}) => {
  if (
    !previousDoc ||
    previousDoc.status === "RECEIVED" ||
    doc.status !== "RECEIVED"
  )
    return;

  assertOrderTransition(
    String(previousDoc.status) as OrderStatus,
    String(doc.status) as OrderStatus,
    req.user?.role,
  );

  await req.payload.create({
    req,
    collection: "wms-transactions",
    data: {
      scope: "FARM",
      tenant: relationId(doc.destination),
      flock: relationId(doc.flock),
      product: relationId(doc.product),
      txnType: "INBOUND",
      quantity: doc.quantity,
      order: doc.id,
      date: new Date().toISOString(),
      beginQuantity: 0,
      inQuantity: doc.quantity,
      outQuantity: 0,
      endQuantity: doc.quantity,
    } as never,
    overrideAccess: true,
  });

  if (req.user) {
    await writeAudit(
      req.payload,
      {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: "ORDER_RECEIVED",
        targetCollection: "orders",
        targetId: doc.id,
        before: { status: previousDoc.status },
        after: { status: doc.status },
      },
      req,
    );
  }

  await queueAfterCommit(
    req,
    "sendOrderNotification",
    { orderId: String(doc.id), newStatus: String(doc.status) },
    "notifications",
  );
};
