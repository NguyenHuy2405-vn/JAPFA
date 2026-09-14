import crypto from "node:crypto";
import type { Payload } from "payload";
import { AppError } from "@/lib/errors/app-error";
import type { CreateFarmInput } from "@/validators/farm.validator";
import { writeAudit, type ActorContext, type AuditContext } from "@/services/audit/audit.service";

export type CreateFarmResult = {
  tenantId: string | number;
  userId: string | number;
  tempPassword: string;
};

const TEMP_PASSWORD_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

const generateTempPassword = (): string => {
  const bytes = crypto.randomBytes(12);
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += TEMP_PASSWORD_CHARSET[bytes[i] % TEMP_PASSWORD_CHARSET.length];
  }
  return result;
};

export const createFarmWithAccount = async (
  payload: Payload,
  actor: ActorContext,
  input: CreateFarmInput,
  auditContext?: AuditContext,
): Promise<CreateFarmResult> => {
  const existingFarm = await payload.find({
    collection: "tenants",
    where: { farmCode: { equals: input.farmCode } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (existingFarm.docs.length > 0) {
    throw new AppError(
      "DUPLICATE_FARM_CODE",
      "Mã trang trại đã tồn tại trên hệ thống.",
      409,
      { field: "farmCode", value: input.farmCode },
    );
  }

  const existingUser = await payload.find({
    collection: "users",
    where: { email: { equals: input.adminEmail } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (existingUser.docs.length > 0) {
    throw new AppError(
      "DUPLICATE_EMAIL",
      "Email đã được sử dụng cho tài khoản khác.",
      409,
      { field: "adminEmail", value: input.adminEmail },
    );
  }

  const tempPassword = generateTempPassword();
  const createdByValue = Number(actor.id);

  let tenantId: string | number | undefined;
  let userId: string | number | undefined;

  try {
    const tenant = await payload.create({
      collection: "tenants",
      draft: false,
      data: {
        tenantId: input.farmCode,
        farmCode: input.farmCode,
        name: input.farmName,
        type: input.farmType,
        status: "ACTIVE",
        addressOfTenant: input.address,
        phone: input.phone || undefined,
      },
      overrideAccess: true,
    });

    tenantId = tenant.id;

    const user = await payload.create({
      collection: "users",
      draft: false,
      data: {
        email: input.adminEmail,
        password: tempPassword,
        fullName: input.adminFullName,
        phone: input.adminPhone || undefined,
        role: "FARM",
        accountStatus: "ACTIVE",
        mustChangePassword: true,
        authzVersion: 1,
        primaryTenant: tenant.id,
        tenantMemberships: [tenant.id],
        createdBy: Number.isFinite(createdByValue) ? createdByValue : undefined,
      },
      overrideAccess: true,
    });

    userId = user.id;

    await payload.update({
      collection: "tenants",
      id: tenant.id,
      data: { managedByUser: user.id },
      overrideAccess: true,
    });

    const result = {
      tenantId: tenant.id,
      userId: user.id,
      tempPassword,
    };
    await writeAudit(payload, {
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "FARM_CREATED",
      targetCollection: "tenants",
      targetId: result.tenantId,
      after: {
        farmCode: input.farmCode,
        farmName: input.farmName,
        farmType: input.farmType,
        adminEmail: input.adminEmail,
      },
      ...auditContext,
    });
    return result;
  } catch (error) {
    if (userId !== undefined) {
      try {
        await payload.delete({
          collection: "users",
          id: userId,
          overrideAccess: true,
        });
      } catch (rollbackError) {
        console.error("[ROLLBACK_FAILED] user", {
          userId,
          error:
            rollbackError instanceof Error
              ? rollbackError.message
              : String(rollbackError),
        });
      }
    }

    if (tenantId !== undefined) {
      try {
        await payload.delete({
          collection: "tenants",
          id: tenantId,
          overrideAccess: true,
        });
      } catch (rollbackError) {
        console.error("[ROLLBACK_FAILED] tenant", {
          tenantId,
          error:
            rollbackError instanceof Error
              ? rollbackError.message
              : String(rollbackError),
        });
      }
    }

    throw error;
  }
};
