import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  clearSession,
  createSession,
  getAppUser,
  getRoleLandingPage,
  verifyPassword,
} from "@/server/auth";
import { changePasswordSchema } from "@/validators/auth.validator";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const appUser = await getAppUser();
    if (!appUser) {
      return NextResponse.json(
        {
          success: false,
          ok: false,
          error: "UNAUTHORIZED",
          message: "Bạn chưa đăng nhập.",
        },
        { status: 401 },
      );
    }

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = changePasswordSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          ok: false,
          error: "VALIDATION_ERROR",
          message: issue?.message || "Dữ liệu đổi mật khẩu không hợp lệ.",
        },
        { status: 400 },
      );
    }

    const { currentPassword, newPassword } = parseResult.data;

    if (currentPassword === newPassword) {
      return NextResponse.json(
        {
          success: false,
          ok: false,
          error: "VALIDATION_ERROR",
          message: "Mật khẩu mới phải khác mật khẩu hiện tại.",
        },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });
    const userDoc = await payload.findByID({
      collection: "users",
      id: appUser.id,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    });

    const userSecret = userDoc as unknown as {
      salt?: string;
      hash?: string;
      authzVersion?: number;
      role?: string;
    };

    const isCurrentValid = Boolean(
      userSecret?.salt &&
        userSecret?.hash &&
        (await verifyPassword(currentPassword, userSecret.salt, userSecret.hash)),
    );

    if (!isCurrentValid) {
      return NextResponse.json(
        {
          success: false,
          ok: false,
          error: "VALIDATION_ERROR",
          message: "Mật khẩu hiện tại không đúng.",
        },
        { status: 400 },
      );
    }

    const newAuthzVersion = (userSecret.authzVersion ?? 1) + 1;

    await payload.update({
      collection: "users",
      id: appUser.id,
      data: {
        password: newPassword,
        mustChangePassword: false,
        authzVersion: newAuthzVersion,
      },
      overrideAccess: true,
    });

    // Reset session: invalidate old session and create new session
    await clearSession();
    await createSession(appUser.id, newAuthzVersion);

    const redirectTo = getRoleLandingPage(appUser.role);

    // LEGACY: ok field included for backward compatibility, remove Phase 7
    return NextResponse.json({
      success: true,
      ok: true,
      data: {
        message: "Đổi mật khẩu thành công.",
        redirectTo,
      },
    });
  } catch (error) {
    console.error("Change password failed", error);
    return NextResponse.json(
      {
        success: false,
        ok: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Không thể đổi mật khẩu lúc này.",
      },
      { status: 500 },
    );
  }
}
