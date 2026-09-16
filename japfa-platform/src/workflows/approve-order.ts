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

export const approveOrderWorkflow: CollectionAfterChangeHook = async ({
  req,
  doc,
  previousDoc,
}) => {
  if (
    !previousDoc ||
    previousDoc.status === "APPROVED" ||
    doc.status !== "APPROVED"
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
      scope: "FACTORY",
      tenant: relationId(doc.origin),
      product: relationId(doc.product),
      txnType: "OUTBOUND",
      quantity: doc.quantity,
      order: doc.id,
      date: new Date().toISOString(),
      beginQuantity: 0,
      inQuantity: 0,
      outQuantity: doc.quantity,
      endQuantity: -Number(doc.quantity),
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
        action: "APPROVE_ORDER",
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
