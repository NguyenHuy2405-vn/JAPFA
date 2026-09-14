import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { canCreateFarm } from "@/access/roles";
import { AppError } from "@/lib/errors/app-error";
import { getAppUser } from "@/server/auth";
import { createFarmWithAccount } from "@/services/admin/farm.admin.service";
import { createFarmSchema } from "@/validators/farm.validator";

export async function POST(req: Request) {
  try {
    const actor = await getAppUser();
    if (!actor) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "Vui lòng đăng nhập.",
        },
        { status: 401 },
      );
    }

    if (!canCreateFarm(actor.role)) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message: "Chỉ ADMIN được tạo Farm.",
        },
        { status: 403 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Body không phải JSON hợp lệ.",
        },
        { status: 400 },
      );
    }

    const parsed = createFarmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Dữ liệu không hợp lệ.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });
    const result = await createFarmWithAccount(
      payload,
      { id: actor.id, email: actor.email, role: actor.role },
      parsed.data,
      {
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          tenantId: result.tenantId,
          userId: result.userId,
          tempPassword: result.tempPassword,
          message: "Tạo Farm thành công. Gửi temp password cho quản lý Farm.",
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: err.code,
          message: err.message,
          details: err.details,
        },
        { status: err.statusCode },
      );
    }

    console.error("[API] POST /api/admin/farms", {
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Đã xảy ra lỗi hệ thống.",
      },
      { status: 500 },
    );
  }
}
