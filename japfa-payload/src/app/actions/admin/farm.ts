"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import config from "@payload-config";
import { canCreateFarm, isAdmin } from "@/access/roles";
import { AppError } from "@/lib/errors/app-error";
import { getAppUser } from "@/server/auth";
import { createFarmWithAccount } from "@/services/admin/farm.admin.service";
import { createFarmSchema } from "@/validators/farm.validator";
import { z } from "zod";

const idSchema = z.union([z.string().min(1), z.number()]);

type ActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      message: string;
      details?: unknown;
    };

export async function createFarmAction(
  formData: unknown,
): Promise<
  ActionResult<{
    tenantId: string | number;
    userId: string | number;
    tempPassword: string;
  }>
> {
  const actor = await getAppUser();
  if (!actor) {
    return {
      success: false,
      error: "UNAUTHORIZED",
      message: "Vui lòng đăng nhập.",
    };
  }

  if (!canCreateFarm(actor.role)) {
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Chỉ ADMIN được tạo Farm.",
    };
  }

  const parsed = createFarmSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Dữ liệu không hợp lệ.",
      details: parsed.error.flatten(),
    };
  }

  try {
    const payload = await getPayload({ config });
    const result = await createFarmWithAccount(
      payload,
      {
        id: actor.id,
        email: actor.email,
        role: actor.role,
      },
      parsed.data,
    );

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/farms");
    revalidatePath("/admin/users");

    return { success: true, data: result };
  } catch (err) {
    if (err instanceof AppError) {
      return {
        success: false,
        error: err.code,
        message: err.message,
        details: err.details,
      };
    }

    console.error("[ACTION] createFarmAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi khi tạo Farm.",
    };
  }
}

export async function lockFarmAction(
  tenantId: string | number,
): Promise<ActionResult<{ tenantId: string | number }>> {
  const actor = await getAppUser();
  if (!actor) {
    return {
      success: false,
      error: "UNAUTHORIZED",
      message: "Vui lòng đăng nhập.",
    };
  }

  if (!isAdmin(actor.role)) {
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Chỉ ADMIN được lock Farm.",
    };
  }

  const parsed = idSchema.safeParse(tenantId);
  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Farm không hợp lệ.",
      details: parsed.error.flatten(),
    };
  }

  try {
    const payload = await getPayload({ config });
    const tenant = await payload.update({
      collection: "tenants",
      id: parsed.data,
      data: { status: "LOCKED" },
      overrideAccess: true,
      user: actor,
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/farms");
    revalidatePath("/admin/audit-logs");

    return { success: true, data: { tenantId: tenant.id } };
  } catch (err) {
    console.error("[ACTION] lockFarmAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi khi lock Farm.",
    };
  }
}

export async function unlockFarmAction(
  tenantId: string | number,
): Promise<ActionResult<{ tenantId: string | number }>> {
  const actor = await getAppUser();
  if (!actor) {
    return {
      success: false,
      error: "UNAUTHORIZED",
      message: "Vui lòng đăng nhập.",
    };
  }

  if (!isAdmin(actor.role)) {
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Chỉ ADMIN được unlock Farm.",
    };
  }

  const parsed = idSchema.safeParse(tenantId);
  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Farm không hợp lệ.",
      details: parsed.error.flatten(),
    };
  }

  try {
    const payload = await getPayload({ config });
    const tenant = await payload.update({
      collection: "tenants",
      id: parsed.data,
      data: { status: "ACTIVE" },
      overrideAccess: true,
      user: actor,
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/farms");
    revalidatePath("/admin/audit-logs");

    return { success: true, data: { tenantId: tenant.id } };
  } catch (err) {
    console.error("[ACTION] unlockFarmAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi khi unlock Farm.",
    };
  }
}
