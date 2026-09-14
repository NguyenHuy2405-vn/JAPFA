"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import { isFarm, userTenantIds } from "@/access/roles";
import { AppError } from "@/lib/errors/app-error";

const idSchema = z.coerce.number().positive();
const createFmsSchema = z.object({
  flockId: idSchema,
  date: z.string().min(1, "Ngày là bắt buộc."),
  ageInDays: z.number().min(0, "Ngày tuổi không hợp lệ."),
  endQty: z.number().min(0, "Số lượng cuối kỳ không hợp lệ."),
  mortality: z.number().min(0).optional(),
  feedQty: z.number().min(0).optional(),
  avgWeight: z.number().min(0).optional(),
  note: z.string().trim().optional(),
});

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; message: string; details?: unknown };

const toNumberId = (value: string | number): number => Number(value);

export async function createFmsLogAction(
  formData: unknown,
): Promise<ActionResult<{ logId: string | number }>> {
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
      message: "Chỉ FARM được ghi nhật ký.",
    };
  }

  const parsed = createFmsSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Dữ liệu nhật ký FMS không hợp lệ.",
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

    const tenantId = toNumberId(tenantIds[0]);

    const log = await payload.create({
      collection: "fms-daily-logs",
      data: {
        tenant: tenantId,
        flock: parsed.data.flockId,
        date: parsed.data.date,
        ageInDays: parsed.data.ageInDays,
        endQty: parsed.data.endQty,
        mortAct: parsed.data.mortality,
        feedQtyAct: parsed.data.feedQty,
      } as never,
      overrideAccess: true,
      user: actor,
    });

    revalidatePath("/farm/dashboard");
    revalidatePath("/farm/fms");
    return { success: true, data: { logId: log.id } };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.code, message: err.message };
    }
    console.error("[ACTION] createFmsLogAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}
