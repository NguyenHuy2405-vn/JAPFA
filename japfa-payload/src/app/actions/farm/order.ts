"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import { isFarm, userTenantIds } from "@/access/roles";
import { AppError } from "@/lib/errors/app-error";

const idSchema = z.coerce.number().positive();
const createOrderSchema = z.object({
  client: z.string().trim().min(2, "Tên khách hàng không hợp lệ."),
  originId: idSchema,
  destinationId: idSchema,
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
  revalidatePath("/farm/orders");
  revalidatePath("/farm/notifications");
  revalidatePath("/farm/wms");
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

export async function createOrderAction(
  formData: unknown,
): Promise<ActionResult<{ orderId: string | number }>> {
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
      message: "Chỉ FARM được tạo đơn.",
    };
  }

  const parsed = createOrderSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Dữ liệu tạo đơn không hợp lệ.",
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

    if (!tenantIds.map(String).includes(String(parsed.data.originId))) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Nơi đi phải thuộc Farm của bạn.",
      };
    }

    const tenantId = toNumberId(tenantIds[0]);

    const order = await payload.create({
      collection: "orders",
      data: {
        tenant: tenantId,
        client: parsed.data.client,
        origin: parsed.data.originId,
        destination: parsed.data.destinationId,
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
    return { success: true, data: { orderId: order.id } };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.code, message: err.message };
    }
    console.error("[ACTION] createOrderAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}

export async function submitOrderAction(
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
  if (!isFarm(actor.role)) {
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Chỉ FARM được submit đơn.",
    };
  }

  const parsedId = idSchema.safeParse(orderId);
  if (!parsedId.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Mã đơn không hợp lệ.",
    };
  }

  try {
    const payload = await getPayload({ config });
    const tenantIds = userTenantIds(actor);
    const order = await payload.findByID({
      collection: "orders",
      id: parsedId.data,
      depth: 0,
      overrideAccess: true,
      user: actor,
    });

    if (!hasTenant(tenantIds, order.tenant)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Bạn không có quyền.",
      };
    }

    if (order.status !== "DRAFT") {
      return {
        success: false,
        error: "INVALID_TRANSITION",
        message: `Không thể submit đơn ở trạng thái ${order.status}.`,
      };
    }

    await payload.update({
      collection: "orders",
      id: parsedId.data,
      data: { status: "SUBMITTED" },
      overrideAccess: true,
      user: actor,
    });

    refreshFarmPaths();
    return { success: true, data: { orderId: parsedId.data } };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.code, message: err.message };
    }
    console.error("[ACTION] submitOrderAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}

export async function cancelOrderAction(
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
  if (!isFarm(actor.role)) {
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Chỉ FARM được hủy đơn.",
    };
  }

  const parsedId = idSchema.safeParse(orderId);
  if (!parsedId.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Mã đơn không hợp lệ.",
    };
  }

  try {
    const payload = await getPayload({ config });
    const tenantIds = userTenantIds(actor);
    const order = await payload.findByID({
      collection: "orders",
      id: parsedId.data,
      depth: 0,
      overrideAccess: true,
      user: actor,
    });

    if (!hasTenant(tenantIds, order.tenant)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Bạn không có quyền.",
      };
    }

    if (order.status !== "DRAFT") {
      return {
        success: false,
        error: "INVALID_TRANSITION",
        message: `Không thể hủy đơn ở trạng thái ${order.status}.`,
      };
    }

    await payload.update({
      collection: "orders",
      id: parsedId.data,
      data: { status: "CANCELLED" },
      overrideAccess: true,
      user: actor,
    });

    refreshFarmPaths();
    return { success: true, data: { orderId: parsedId.data } };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.code, message: err.message };
    }
    console.error("[ACTION] cancelOrderAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}

export async function receiveOrderAction(
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
  if (!isFarm(actor.role)) {
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Chỉ FARM được nhận hàng.",
    };
  }

  const parsedId = idSchema.safeParse(orderId);
  if (!parsedId.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Mã đơn không hợp lệ.",
    };
  }

  try {
    const payload = await getPayload({ config });
    const tenantIds = userTenantIds(actor);
    const order = await payload.findByID({
      collection: "orders",
      id: parsedId.data,
      depth: 0,
      overrideAccess: true,
      user: actor,
    });

    if (!hasTenant(tenantIds, order.destination)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Bạn không phải là Farm nhận hàng.",
      };
    }

    if (order.status !== "IN_TRANSIT") {
      return {
        success: false,
        error: "INVALID_TRANSITION",
        message: `Không thể nhận hàng ở trạng thái ${order.status}.`,
      };
    }

    await payload.update({
      collection: "orders",
      id: parsedId.data,
      data: { status: "RECEIVED" },
      overrideAccess: true,
      user: actor,
    });

    refreshFarmPaths();
    return { success: true, data: { orderId: parsedId.data } };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.code, message: err.message };
    }
    console.error("[ACTION] receiveOrderAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}
