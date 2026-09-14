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
  orderId: idSchema,
  reason: z.string().trim().min(3, "Lý do từ chối phải có ít nhất 3 ký tự."),
});

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; message: string; details?: unknown };

const refreshOperationPaths = () => {
  revalidatePath("/operation/dashboard");
  revalidatePath("/operation/orders/pending");
  revalidatePath("/operation/orders/in-transit");
  revalidatePath("/operation/notifications");
};

export async function approveOrderAction(
  orderId: string | number,
): Promise<ActionResult<{ orderId: string | number }>> {
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
      message: "Chỉ OPERATION được duyệt đơn.",
    };
  }

  const parsedId = idSchema.safeParse(orderId);
  if (!parsedId.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Mã đơn không hợp lệ.",
      details: parsedId.error.flatten(),
    };
  }

  try {
    const payload = await getPayload({ config });
    const order = await payload.findByID({
      collection: "orders",
      id: parsedId.data,
      depth: 0,
      overrideAccess: true,
      user: actor,
    });

    if (order.status !== "SUBMITTED") {
      return {
        success: false,
        error: "INVALID_TRANSITION",
        message: `Không thể duyệt đơn ở trạng thái ${order.status}.`,
      };
    }

    await payload.update({
      collection: "orders",
      id: parsedId.data,
      data: { status: "APPROVED" },
      overrideAccess: true,
      user: actor,
    });

    refreshOperationPaths();
    return { success: true, data: { orderId: parsedId.data } };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.code, message: err.message };
    }
    console.error("[ACTION] approveOrderAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}

export async function rejectOrderAction(
  orderId: string | number,
  reason: string,
): Promise<ActionResult<{ orderId: string | number }>> {
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
      message: "Chỉ OPERATION được từ chối đơn.",
    };
  }

  const parsedInput = rejectSchema.safeParse({ orderId, reason });
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
    const order = await payload.findByID({
      collection: "orders",
      id: parsedInput.data.orderId,
      depth: 0,
      overrideAccess: true,
      user: actor,
    });

    if (order.status !== "SUBMITTED") {
      return {
        success: false,
        error: "INVALID_TRANSITION",
        message: `Không thể từ chối đơn ở trạng thái ${order.status}.`,
      };
    }

    await payload.update({
      collection: "orders",
      id: parsedInput.data.orderId,
      data: {
        status: "REJECTED",
        note: parsedInput.data.reason,
      },
      overrideAccess: true,
      user: actor,
    });

    refreshOperationPaths();
    return { success: true, data: { orderId: parsedInput.data.orderId } };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.code, message: err.message };
    }
    console.error("[ACTION] rejectOrderAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}
