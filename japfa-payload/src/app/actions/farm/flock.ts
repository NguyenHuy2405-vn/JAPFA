"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import { isFarm, userTenantIds } from "@/access/roles";
import { AppError } from "@/lib/errors/app-error";

const idSchema = z.coerce.number().positive();

const createFlockSchema = z.object({
  flockId: z.string().trim().min(3, "Mã đàn phải có ít nhất 3 ký tự."),
  flockName: z.string().trim().optional(),
  chickenType: z.string().trim().min(1, "Loại gà là bắt buộc."),
  startDate: z.string().min(1, "Ngày vào đàn là bắt buộc."),
  initialBirdCount: z.number().positive("Số lượng ban đầu phải lớn hơn 0."),
  sourceFlockGroup: z.string().trim().optional(),
  standardsApplied: z.string().trim().optional(),
});

const updateFlockSchema = z.object({
  flockName: z.string().trim().optional(),
  chickenType: z.string().trim().min(1).optional(),
  initialBirdCount: z.number().positive().optional(),
  sourceFlockGroup: z.string().trim().optional(),
  standardsApplied: z.string().trim().optional(),
});

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; message: string; details?: unknown };

const hasTenant = (
  tenantIds: Array<string | number>,
  value: unknown,
): boolean => {
  const normalized =
    typeof value === "object" && value !== null
      ? (value as { id?: string | number }).id
      : (value as string | number | undefined);
  return normalized !== undefined && tenantIds.includes(normalized);
};

const refreshFarmPaths = () => {
  revalidatePath("/farm/flocks");
  revalidatePath("/farm/wms");
  revalidatePath("/farm/fms");
};

export async function createFlockAction(
  formData: unknown,
): Promise<ActionResult<{ flockId: string | number }>> {
  const actor = await getAppUser();
  if (!actor) {
    return {
      success: false,
      error: "UNAUTHORIZED",
      message: "Vui lòng đăng nhập.",
    };
  }
  if (!isFarm(actor.role)) {
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Chỉ FARM được tạo đàn.",
    };
  }

  const parsed = createFlockSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Dữ liệu tạo đàn không hợp lệ.",
      details: parsed.error.flatten(),
    };
  }

  try {
    const payload = await getPayload({ config });
    const tenantIds = userTenantIds(actor);
    if (!tenantIds.length) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Bạn không thuộc Farm nào.",
      };
    }

    const existing = await payload.find({
      collection: "flocks",
      where: { flockId: { equals: parsed.data.flockId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      user: actor,
    });

    if (existing.docs.length > 0) {
      return {
        success: false,
        error: "DUPLICATE_FLOCK_ID",
        message: "Mã đàn đã tồn tại.",
      };
    }

    const flock = await payload.create({
      collection: "flocks",
      data: {
        flockId: parsed.data.flockId,
        flockName: parsed.data.flockName,
        tenant: Number(tenantIds[0]),
        chickenType: parsed.data.chickenType,
        initialBirdCount: parsed.data.initialBirdCount,
        startDate: parsed.data.startDate,
        sourceFlockGroup: parsed.data.sourceFlockGroup,
        standardsApplied: parsed.data.standardsApplied,
      } as never,
      overrideAccess: true,
      user: actor,
    });

    refreshFarmPaths();
    return { success: true, data: { flockId: flock.id } };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.code, message: err.message };
    }
    console.error("[ACTION] createFlockAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}

export async function updateFlockAction(
  flockId: string | number,
  formData: unknown,
): Promise<ActionResult<{ flockId: string | number }>> {
  const actor = await getAppUser();
  if (!actor) {
    return {
      success: false,
      error: "UNAUTHORIZED",
      message: "Vui lòng đăng nhập.",
    };
  }
  if (!isFarm(actor.role)) {
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Chỉ FARM được sửa đàn.",
    };
  }

  const parsedId = idSchema.safeParse(flockId);
  const parsedData = updateFlockSchema.safeParse(formData);
  if (!parsedId.success || !parsedData.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Dữ liệu cập nhật đàn không hợp lệ.",
      details: {
        flockId: parsedId.success ? undefined : parsedId.error.flatten(),
        formData: parsedData.success ? undefined : parsedData.error.flatten(),
      },
    };
  }

  try {
    const payload = await getPayload({ config });
    const tenantIds = userTenantIds(actor);
    const flock = await payload.findByID({
      collection: "flocks",
      id: parsedId.data,
      depth: 0,
      overrideAccess: true,
      user: actor,
    });

    if (!hasTenant(tenantIds, flock.tenant)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Bạn không có quyền.",
      };
    }

    await payload.update({
      collection: "flocks",
      id: parsedId.data,
      data: parsedData.data as never,
      overrideAccess: true,
      user: actor,
    });

    refreshFarmPaths();
    return { success: true, data: { flockId: parsedId.data } };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.code, message: err.message };
    }
    console.error("[ACTION] updateFlockAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}
