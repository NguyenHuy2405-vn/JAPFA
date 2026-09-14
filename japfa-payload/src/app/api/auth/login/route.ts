import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  createSession,
  getRoleLandingPage,
  verifyPassword,
} from "@/server/auth";
import { loginLimiter } from "@/lib/rate-limit";
import { loginSchema } from "@/validators/auth.validator";
import type { Tenant } from "../../../../../payload-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const rateLimitResult = loginLimiter.check(`login:${ip}`);
    if (!rateLimitResult.allowed) {
      const retryAfter = Math.max(
        1,
        Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
      );

      return NextResponse.json(
        {
          success: false,
          ok: false,
          error: "RATE_LIMITED",
          message: `Quá nhiều lần đăng nhập. Vui lòng thử lại sau ${retryAfter} giây.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        },
      );
    }

    const rawBody = await request.json().catch(() => ({}));
    const parseResult = loginSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          ok: false,
          error: "VALIDATION_ERROR",
          message: issue?.message || "Dữ liệu đăng nhập không hợp lệ.",
        },
        { status: 400 },
      );
    }

    const { email: rawEmail, password } = parseResult.data;
    const email = rawEmail.trim().toLowerCase();

    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "users",
      where: { email: { equals: email } },
      limit: 1,
      depth: 2,
      overrideAccess: true,
      showHiddenFields: true,
    });

    const user = result.docs[0] as
      | {
          id: string | number;
          email: string;
          role?: string | null;
          salt?: string;
          hash?: string;
          accountStatus?: string;
          authzVersion?: number;
          mustChangePassword?: boolean;
          primaryTenant?: Tenant | string | number | null;
        }
      | undefined;

    const valid = Boolean(
      user?.id &&
      user.salt &&
      user.hash &&
      (await verifyPassword(password, user.salt, user.hash)),
    );

    if (!user || !valid) {
      return NextResponse.json(
        {
          success: false,
          ok: false,
          error: "UNAUTHORIZED",
          message: "Email hoặc mật khẩu không đúng.",
        },
        { status: 401 },
      );
    }

    // CHECK accountStatus
    if (user.accountStatus === "LOCKED") {
      return NextResponse.json(
        {
          success: false,
          ok: false,
          error: "FORBIDDEN",
          message:
            "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
        },
        { status: 403 },
      );
    }

    // CHECK primaryTenant status
    if (user.primaryTenant && typeof user.primaryTenant === "object") {
      const tenant = user.primaryTenant as Tenant;
      if (tenant.status === "LOCKED") {
        return NextResponse.json(
          {
            success: false,
            ok: false,
            error: "FORBIDDEN",
            message:
              "Đơn vị của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
          },
          { status: 403 },
        );
      }
    }

    const authzVersion = user.authzVersion ?? 1;
    await createSession(user.id, authzVersion);

    const mustChangePassword = Boolean(user.mustChangePassword);
    const redirectTo = mustChangePassword
      ? "/change-password"
      : getRoleLandingPage(user.role);

    // Sanitize user object for client
    const primaryTenantObj =
      user.primaryTenant && typeof user.primaryTenant === "object"
        ? {
            id: (user.primaryTenant as Tenant).id,
            name: (user.primaryTenant as Tenant).name,
          }
        : null;

    const sanitizedUser = {
      id: user.id,
      email: user.email,
      role: user.role || "FARM",
      primaryTenant: primaryTenantObj,
    };

    // LEGACY: ok field included for backward compatibility, remove Phase 7
    return NextResponse.json({
      success: true,
      ok: true,
      data: {
        redirectTo,
        mustChangePassword,
        user: sanitizedUser,
      },
    });
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json(
      {
        success: false,
        ok: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Không thể đăng nhập lúc này.",
      },
      { status: 500 },
    );
  }
}
