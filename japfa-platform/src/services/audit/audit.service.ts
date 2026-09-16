import type { Payload, PayloadRequest } from "payload";
import type { AuthUser } from "@/types/auth.types";

export type AuditAction =
  | "FARM_CREATED"
  | "CREATE_FARM"
  | "FARM_LOCKED"
  | "FARM_UNLOCKED"
  | "USER_CREATED"
  | "USER_ROLE_CHANGED"
  | "USER_LOCKED"
  | "USER_UNLOCKED"
  | "USER_TEMP_PASSWORD_REGENERATED"
  | "ORDER_APPROVED"
  | "ORDER_REJECTED"
  | "APPROVE_ORDER"
  | "RECEIVE_ORDER"
  | "ORDER_RECEIVED"
  | "ORDER_COMPLETED"
  | "TRANSFER_APPROVED"
  | "TRANSFER_REJECTED"
  | "TRANSFER_RECEIVED";

export type WriteAuditInput = {
  actorUserId: string | number;
  actorEmail: string;
  actorRole: string;
  action: AuditAction;
  targetCollection: string;
  targetId: string | number;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
};

export const writeAudit = async (
  payload: Payload,
  input: WriteAuditInput,
  req?: PayloadRequest,
): Promise<void> => {
  await payload.create({
    collection: "audit-logs",
    draft: false,
    data: {
      actorUserId: Number(input.actorUserId),
      actorEmail: input.actorEmail,
      actorRole: input.actorRole,
      action: input.action,
      targetCollection: input.targetCollection,
      targetId: String(input.targetId),
      before: input.before as never,
      after: input.after as never,
      ip: input.ip,
      userAgent: input.userAgent,
      timestamp: new Date().toISOString(),
    },
    overrideAccess: true,
    req,
  });
};

export type ActorContext = {
  id: string | number;
  email: string;
  role: string;
};

export type AuditContext = { ip?: string; userAgent?: string };

export const extractActorInfo = (
  user: AuthUser | null | undefined,
  context?: AuditContext,
): (ActorContext & AuditContext) | null => {
  if (!user?.id || !user.email || !user.role) return null;
  return { id: user.id, email: user.email, role: user.role, ...context };
};
