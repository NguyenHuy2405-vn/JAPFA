"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import config from "@payload-config";
import { canCreateUser, isAdmin } from "@/access/roles";
import { getAppUser } from "@/server/auth";
import { writeAudit } from "@/services/audit/audit.service";
import { z } from "zod";

const idSchema = z.union([z.string().min(1), z.number()]);
const roleSchema = z.enum(["ADMIN", "OPERATION", "FARM"]);

const createOperationUserSchema = z.object({
  email: z.string().email("Email không hợp lệ.").max(200),
  fullName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự.").max(200),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]*$/, "Số điện thoại không hợp lệ.")
    .optional()
    .or(z.literal("")),
});

type ActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      message: string;
      details?: unknown;
    };

const generateTempPassword = (): string => {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(12);
  let result = "";
  for (let index = 0; index < 12; index += 1) {
    result += charset[bytes[index] % charset.length];
  }
  return result;
};

const refreshAdminUserPaths = () => {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/users");
  revalidatePath("/admin/audit-logs");
};

export async function createOperationUserAction(
  formData: unknown,
): Promise<ActionResult<{ userId: string | number; tempPassword: string }>> {
  const actor = await getAppUser();
  if (!actor) {
    return {
      success: false,
      error: "UNAUTHORIZED",
      message: "Vui lòng đăng nhập.",
    };
  }

  if (!canCreateUser(actor.role, "OPERATION")) {
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Chỉ ADMIN được tạo OPERATION user.",
    };
  }

  const parsed = createOperationUserSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Dữ liệu không hợp lệ.",
      details: parsed.error.flatten(),
    };
  }

  const input = {
    ...parsed.data,
    email: parsed.data.email.trim().toLowerCase(),
    phone: parsed.data.phone || undefined,
  };

  try {
    const payload = await getPayload({ config });
    const existing = await payload.find({
      collection: "users",
      where: { email: { equals: input.email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    if (existing.docs.length > 0) {
      return {
        success: false,
        error: "DUPLICATE_EMAIL",
        message: "Email đã được sử dụng.",
      };
    }

    const tempPassword = generateTempPassword();
    const user = await payload.create({
      collection: "users",
      data: {
        email: input.email,
        password: tempPassword,
        fullName: input.fullName,
        phone: input.phone,
        role: "OPERATION",
        accountStatus: "ACTIVE",
        mustChangePassword: true,
        authzVersion: 1,
        createdBy: Number.isFinite(Number(actor.id))
          ? Number(actor.id)
          : undefined,
      },
      overrideAccess: true,
      user: actor,
    });

    await writeAudit(payload, {
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "USER_CREATED",
      targetCollection: "users",
      targetId: user.id,
      after: { email: user.email, role: "OPERATION" },
    });

    refreshAdminUserPaths();
    return { success: true, data: { userId: user.id, tempPassword } };
  } catch (err) {
    console.error("[ACTION] createOperationUserAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi khi tạo user.",
    };
  }
}

export async function lockUserAction(
  userId: string | number,
): Promise<ActionResult<{ userId: string | number }>> {
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
      message: "Chỉ ADMIN được lock user.",
    };
  }

  const parsed = idSchema.safeParse(userId);
  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "User không hợp lệ.",
      details: parsed.error.flatten(),
    };
  }

  if (String(actor.id) === String(parsed.data)) {
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Không thể tự lock tài khoản của mình.",
    };
  }

  try {
    const payload = await getPayload({ config });
    const user = await payload.findByID({
      collection: "users",
      id: parsed.data,
      depth: 0,
      overrideAccess: true,
    });

    await payload.update({
      collection: "users",
      id: parsed.data,
      data: {
        accountStatus: "LOCKED",
        authzVersion: (user.authzVersion || 1) + 1,
      },
      overrideAccess: true,
      user: actor,
    });

    refreshAdminUserPaths();
    return { success: true, data: { userId: parsed.data } };
  } catch (err) {
    console.error("[ACTION] lockUserAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi khi lock user.",
    };
  }
}

export async function unlockUserAction(
  userId: string | number,
): Promise<ActionResult<{ userId: string | number }>> {
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
      message: "Chỉ ADMIN được unlock user.",
    };
  }

  const parsed = idSchema.safeParse(userId);
  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "User không hợp lệ.",
      details: parsed.error.flatten(),
    };
  }

  try {
    const payload = await getPayload({ config });
    const user = await payload.findByID({
      collection: "users",
      id: parsed.data,
      depth: 0,
      overrideAccess: true,
    });

    await payload.update({
      collection: "users",
      id: parsed.data,
      data: {
        accountStatus: "ACTIVE",
        authzVersion: (user.authzVersion || 1) + 1,
      },
      overrideAccess: true,
      user: actor,
    });

    refreshAdminUserPaths();
    return { success: true, data: { userId: parsed.data } };
  } catch (err) {
    console.error("[ACTION] unlockUserAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi khi unlock user.",
    };
  }
}

export async function changeUserRoleAction(
  userId: string | number,
  newRole: "ADMIN" | "OPERATION" | "FARM",
): Promise<ActionResult<{ userId: string | number; newRole: string }>> {
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
      message: "Chỉ ADMIN được đổi role user.",
    };
  }

  const parsedId = idSchema.safeParse(userId);
  const parsedRole = roleSchema.safeParse(newRole);
  if (!parsedId.success || !parsedRole.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "Thông tin đổi role không hợp lệ.",
      details: {
        id: parsedId.success ? undefined : parsedId.error.flatten(),
        role: parsedRole.success ? undefined : parsedRole.error.flatten(),
      },
    };
  }

  try {
    const payload = await getPayload({ config });
    const user = await payload.findByID({
      collection: "users",
      id: parsedId.data,
      depth: 0,
      overrideAccess: true,
    });

    await payload.update({
      collection: "users",
      id: parsedId.data,
      data: {
        role: parsedRole.data,
        authzVersion: (user.authzVersion || 1) + 1,
      },
      overrideAccess: true,
      user: actor,
    });

    refreshAdminUserPaths();
    return {
      success: true,
      data: { userId: parsedId.data, newRole: parsedRole.data },
    };
  } catch (err) {
    console.error("[ACTION] changeUserRoleAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi khi đổi role.",
    };
  }
}

export async function regenerateTempPasswordAction(
  userId: string | number,
): Promise<ActionResult<{ userId: string | number; tempPassword: string }>> {
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
      message: "Chỉ ADMIN được cấp lại mật khẩu tạm.",
    };
  }

  const parsed = idSchema.safeParse(userId);
  if (!parsed.success) {
    return {
      success: false,
      error: "VALIDATION_ERROR",
      message: "User không hợp lệ.",
      details: parsed.error.flatten(),
    };
  }

  if (String(actor.id) === String(parsed.data)) {
    return {
      success: false,
      error: "FORBIDDEN",
      message: "Không thể cấp lại mật khẩu tạm cho chính bạn.",
    };
  }

  try {
    const payload = await getPayload({ config });
    const user = await payload.findByID({
      collection: "users",
      id: parsed.data,
      depth: 0,
      overrideAccess: true,
    });

    const tempPassword = generateTempPassword();
    const newAuthzVersion = (user.authzVersion || 1) + 1;

    await payload.update({
      collection: "users",
      id: parsed.data,
      data: {
        password: tempPassword,
        mustChangePassword: true,
        authzVersion: newAuthzVersion,
        accountStatus: "ACTIVE",
      },
      overrideAccess: true,
      user: actor,
    });

    await writeAudit(payload, {
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "USER_TEMP_PASSWORD_REGENERATED",
      targetCollection: "users",
      targetId: parsed.data,
      after: { email: user.email, role: user.role, mustChangePassword: true },
    });

    refreshAdminUserPaths();
    return { success: true, data: { userId: parsed.data, tempPassword } };
  } catch (err) {
    console.error("[ACTION] regenerateTempPasswordAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi khi cấp lại mật khẩu tạm.",
    };
  }
}
