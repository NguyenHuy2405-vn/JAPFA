"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import { isFarm, userTenantIds } from "@/access/roles";
import { AppError } from "@/lib/errors/app-error";

const idSchema = z.coerce.number().positive();
const txnTypes = [
  "INBOUND",
  "OUTBOUND",
  "ADJUSTMENT",
  "LOSS",
  "CONSUME",
  "REPORT",
] as const;

const createWmsSchema = z.object({
  flockId: idSchema,
  productId: idSchema,
  txnType: z.enum(txnTypes),
  quantity: z.number().positive("Số lượng phải lớn hơn 0."),
  reason: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

const toNumberId = (value: string | number): number => Number(value);

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; message: string; details?: unknown };

export async function createWmsTransactionAction(
  formData: unknown,
): Promise<ActionResult<{ txnId: string | number }>> {
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
      message: "Chỉ FARM được tạo giao dịch.",
    };
  }

  const parsed = createWmsSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Dữ liệu giao dịch kho không hợp lệ.",
      details: parsed.error.flatten(),
    };
  }

  if (
    ["ADJUSTMENT", "LOSS"].includes(parsed.data.txnType) &&
    !parsed.data.reason
  ) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Lý do là bắt buộc cho điều chỉnh/hao hụt.",
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

    const txn = await payload.create({
      collection: "wms-transactions",
      data: {
        scope: "FARM",
        tenant: tenantId,
        flock: parsed.data.flockId,
        product: parsed.data.productId,
        txnType: parsed.data.txnType,
        quantity: parsed.data.quantity,
        reason: parsed.data.reason,
        note: parsed.data.note,
        date: new Date().toISOString(),
      },
      overrideAccess: true,
      user: actor,
    });

    revalidatePath("/farm/dashboard");
    revalidatePath("/farm/wms");
    return { success: true, data: { txnId: txn.id } };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.code, message: err.message };
    }
    console.error("[ACTION] createWmsTransactionAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}
