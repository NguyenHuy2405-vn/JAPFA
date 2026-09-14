"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import { isFarm, userTenantIds } from "@/access/roles";
import { AppError } from "@/lib/errors/app-error";

const idSchema = z.coerce.number().positive();
const createTransferSchema = z.object({
  toTenantId: idSchema,
  productId: idSchema,
  quantity: z.number().positive("Số lượng phải lớn hơn 0."),
  uom: z.string().trim().min(1).optional(),
  note: z.string().trim().optional(),
  flockId: idSchema.optional(),
});

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; message: string; details?: unknown };

const refreshFarmPaths = () => {
  revalidatePath("/farm/dashboard");
  revalidatePath("/farm/transfers");
  revalidatePath("/farm/notifications");
};

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

const toNumberId = (value: string | number): number => Number(value);

export async function createTransferAction(
  formData: unknown,
): Promise<ActionResult<{ transferId: string | number }>> {
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
      message: "Chỉ FARM được tạo điều chuyển.",
    };
  }

  const parsed = createTransferSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Dữ liệu điều chuyển không hợp lệ.",
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

    const fromTenantId = toNumberId(tenantIds[0]);
    if (String(parsed.data.toTenantId) === String(fromTenantId)) {
      return {
        success: false,
        error: "VALIDATION_ERROR",
        message: "Nơi nhận phải khác nơi gửi.",
      };
    }

    const transfer = await payload.create({
      collection: "transfer-requests",
      data: {
        fromTenant: fromTenantId,
        toTenant: parsed.data.toTenantId,
        product: parsed.data.productId,
        quantity: parsed.data.quantity,
        uom: parsed.data.uom || "Bao",
        status: "DRAFT",
        note: parsed.data.note,
        flock: parsed.data.flockId ?? null,
      } as never,
      overrideAccess: true,
      user: actor,
    });

    refreshFarmPaths();
    return { success: true, data: { transferId: transfer.id } };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.code, message: err.message };
    }
    console.error("[ACTION] createTransferAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}

export async function submitTransferAction(
  transferId: string | number,
): Promise<ActionResult<{ transferId: string | number }>> {
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
      message: "Chỉ FARM được submit điều chuyển.",
    };
  }

  const parsedId = idSchema.safeParse(transferId);
  if (!parsedId.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Mã điều chuyển không hợp lệ.",
    };
  }

  try {
    const payload = await getPayload({ config });
    const tenantIds = userTenantIds(actor);
    const transfer = await payload.findByID({
      collection: "transfer-requests",
      id: parsedId.data,
      depth: 0,
      overrideAccess: true,
      user: actor,
    });

    if (!hasTenant(tenantIds, transfer.fromTenant)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Bạn không có quyền.",
      };
    }

    if (transfer.status !== "DRAFT") {
      return {
        success: false,
        error: "INVALID_TRANSITION",
        message: `Không thể submit điều chuyển ở trạng thái ${transfer.status}.`,
      };
    }

    await payload.update({
      collection: "transfer-requests",
      id: parsedId.data,
      data: { status: "SUBMITTED" },
      overrideAccess: true,
      user: actor,
    });

    refreshFarmPaths();
    return { success: true, data: { transferId: parsedId.data } };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.code, message: err.message };
    }
    console.error("[ACTION] submitTransferAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}

export async function cancelTransferAction(
  transferId: string | number,
): Promise<ActionResult<{ transferId: string | number }>> {
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
      message: "Chỉ FARM được hủy điều chuyển.",
    };
  }

  const parsedId = idSchema.safeParse(transferId);
  if (!parsedId.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Mã điều chuyển không hợp lệ.",
    };
  }

  try {
    const payload = await getPayload({ config });
    const tenantIds = userTenantIds(actor);
    const transfer = await payload.findByID({
      collection: "transfer-requests",
      id: parsedId.data,
      depth: 0,
      overrideAccess: true,
      user: actor,
    });

    if (!hasTenant(tenantIds, transfer.fromTenant)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Bạn không có quyền.",
      };
    }

    if (transfer.status !== "DRAFT") {
      return {
        success: false,
        error: "INVALID_TRANSITION",
        message: `Không thể hủy điều chuyển ở trạng thái ${transfer.status}.`,
      };
    }

    await payload.update({
      collection: "transfer-requests",
      id: parsedId.data,
      data: { status: "CANCELLED" },
      overrideAccess: true,
      user: actor,
    });

    refreshFarmPaths();
    return { success: true, data: { transferId: parsedId.data } };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.code, message: err.message };
    }
    console.error("[ACTION] cancelTransferAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}

export async function receiveTransferAction(
  transferId: string | number,
): Promise<ActionResult<{ transferId: string | number }>> {
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
      message: "Chỉ FARM được nhận điều chuyển.",
    };
  }

  const parsedId = idSchema.safeParse(transferId);
  if (!parsedId.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Mã điều chuyển không hợp lệ.",
    };
  }

  try {
    const payload = await getPayload({ config });
    const tenantIds = userTenantIds(actor);
    const transfer = await payload.findByID({
      collection: "transfer-requests",
      id: parsedId.data,
      depth: 0,
      overrideAccess: true,
      user: actor,
    });

    if (!hasTenant(tenantIds, transfer.toTenant)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Bạn không phải là Farm nhận hàng.",
      };
    }

    if (transfer.status !== "IN_TRANSIT") {
      return {
        success: false,
        error: "INVALID_TRANSITION",
        message: `Không thể nhận điều chuyển ở trạng thái ${transfer.status}.`,
      };
    }

    await payload.update({
      collection: "transfer-requests",
      id: parsedId.data,
      data: { status: "RECEIVED" },
      overrideAccess: true,
      user: actor,
    });

    refreshFarmPaths();
    return { success: true, data: { transferId: parsedId.data } };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.code, message: err.message };
    }
    console.error("[ACTION] receiveTransferAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}
