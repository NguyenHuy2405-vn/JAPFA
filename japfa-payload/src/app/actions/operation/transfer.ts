"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import { isOperation } from "@/access/roles";
import { AppError } from "@/lib/errors/app-error";

const idSchema = z.union([z.string().min(1), z.number()]);
const rejectSchema = z.object({
  transferId: idSchema,
  reason: z.string().trim().min(3, "Lý do từ chối phải có ít nhất 3 ký tự."),
});

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; message: string; details?: unknown };

const refreshOperationPaths = () => {
  revalidatePath("/operation/dashboard");
  revalidatePath("/operation/transfers/pending");
  revalidatePath("/operation/transfers/in-transit");
  revalidatePath("/operation/notifications");
};

export async function approveTransferAction(
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

  if (!isOperation(actor.role)) {
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Chỉ OPERATION được duyệt điều chuyển.",
    };
  }

  const parsedId = idSchema.safeParse(transferId);
  if (!parsedId.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Mã lệnh điều chuyển không hợp lệ.",
      details: parsedId.error.flatten(),
    };
  }

  try {
    const payload = await getPayload({ config });
    const transfer = await payload.findByID({
      collection: "transfer-requests",
      id: parsedId.data,
      depth: 0,
      overrideAccess: true,
      user: actor,
    });

    if (transfer.status !== "SUBMITTED") {
      return {
        success: false,
        error: "INVALID_TRANSITION",
        message: `Không thể duyệt điều chuyển ở trạng thái ${transfer.status}.`,
      };
    }

    await payload.update({
      collection: "transfer-requests",
      id: parsedId.data,
      data: { status: "APPROVED" },
      overrideAccess: true,
      user: actor,
    });

    refreshOperationPaths();
    return { success: true, data: { transferId: parsedId.data } };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.code, message: err.message };
    }
    console.error("[ACTION] approveTransferAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}

export async function rejectTransferAction(
  transferId: string | number,
  reason: string,
): Promise<ActionResult<{ transferId: string | number }>> {
  const actor = await getAppUser();
  if (!actor) {
    return {
      success: false,
      error: "UNAUTHORIZED",
      message: "Vui lòng đăng nhập.",
    };
  }

  if (!isOperation(actor.role)) {
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Chỉ OPERATION được từ chối điều chuyển.",
    };
  }

  const parsedInput = rejectSchema.safeParse({ transferId, reason });
  if (!parsedInput.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Dữ liệu không hợp lệ.",
      details: parsedInput.error.flatten(),
    };
  }

  try {
    const payload = await getPayload({ config });
    const transfer = await payload.findByID({
      collection: "transfer-requests",
      id: parsedInput.data.transferId,
      depth: 0,
      overrideAccess: true,
      user: actor,
    });

    if (transfer.status !== "SUBMITTED") {
      return {
        success: false,
        error: "INVALID_TRANSITION",
        message: `Không thể từ chối điều chuyển ở trạng thái ${transfer.status}.`,
      };
    }

    await payload.update({
      collection: "transfer-requests",
      id: parsedInput.data.transferId,
      data: {
        status: "REJECTED",
        note: parsedInput.data.reason,
      },
      overrideAccess: true,
      user: actor,
    });

    refreshOperationPaths();
    return { success: true, data: { transferId: parsedInput.data.transferId } };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.code, message: err.message };
    }
    console.error("[ACTION] rejectTransferAction", err);
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

  // MIGRATION MARKER: Align canReceiveTransfer with spec in Phase 11.
  // Keep direct role check in Phase 7c to avoid backend helper changes.
  if (!isOperation(actor.role)) {
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Chỉ OPERATION được xác nhận nhận hàng.",
    };
  }

  const parsedId = idSchema.safeParse(transferId);
  if (!parsedId.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Mã lệnh điều chuyển không hợp lệ.",
      details: parsedId.error.flatten(),
    };
  }

  try {
    const payload = await getPayload({ config });
    const transfer = await payload.findByID({
      collection: "transfer-requests",
      id: parsedId.data,
      depth: 0,
      overrideAccess: true,
      user: actor,
    });

    if (transfer.status !== "IN_TRANSIT") {
      return {
        success: false,
        error: "INVALID_TRANSITION",
        message: `Không thể xác nhận nhận hàng ở trạng thái ${transfer.status}.`,
      };
    }

    await payload.update({
      collection: "transfer-requests",
      id: parsedId.data,
      data: { status: "RECEIVED" },
      overrideAccess: true,
      user: actor,
    });

    refreshOperationPaths();
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
