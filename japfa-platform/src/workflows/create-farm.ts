import type { CollectionAfterChangeHook } from "payload";
import { writeAudit } from "@/services/audit/audit.service";
import { queueAfterCommit } from "@/services/jobs/queue.service";

export const createFarmWorkflow: CollectionAfterChangeHook = async ({
  req,
  doc,
  operation,
}) => {
  if (operation !== "create" || req.context?.createFarmWorkflow) return;
  if (doc.type !== "FARM" || !doc.contactEmail || !doc.contactName) return;

  const farmUser = await req.payload.create({
    req,
    context: { ...req.context, createFarmWorkflow: true },
    collection: "users",
    data: {
      email: doc.contactEmail,
      password: `Jpfa-${String(doc.id)}-${Date.now()}!`,
      role: "FARM",
      fullName: doc.contactName,
      accountStatus: "ACTIVE",
      primaryTenant: doc.id,
      authzVersion: 1,
      mustChangePassword: true,
    },
    draft: false,
    overrideAccess: true,
  });

  await req.payload.update({
    req,
    context: { ...req.context, createFarmWorkflow: true },
    collection: "tenants",
    id: doc.id,
    data: { managedByUser: farmUser.id },
    overrideAccess: true,
  });

  await writeAudit(
    req.payload,
    {
      actorUserId: req.user?.id ?? farmUser.id,
      actorEmail: req.user?.email ?? "system",
      actorRole: req.user?.role ?? "SYSTEM",
      action: "CREATE_FARM",
      targetCollection: "tenants",
      targetId: doc.id,
      after: { tenantId: doc.tenantId, name: doc.name },
    },
    req,
  );

  await queueAfterCommit(
    req,
    "sendWelcomeEmail",
    { userId: String(farmUser.id), email: farmUser.email },
    "notifications",
  );
};
