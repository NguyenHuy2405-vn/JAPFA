import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAppUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "Vui lòng đăng nhập.",
        },
        { status: 401 },
      );
    }

    const { id } = await params;
    const payload = await getPayload({ config });
    const notification = await payload.findByID({
      collection: "notifications",
      id,
      depth: 0,
      overrideAccess: false,
      user,
    });
    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_FOUND",
          message: "Không tìm thấy thông báo.",
        },
        { status: 404 },
      );
    }

    await payload.update({
      collection: "notifications",
      id,
      data: { isRead: true, readAt: new Date().toISOString() },
      overrideAccess: false,
      user,
    });

    return NextResponse.json({
      success: true,
      data: { message: "Đã đánh dấu đã đọc." },
    });
  } catch (error) {
    console.error("[API] PATCH /api/notifications/[id]/read", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Đã xảy ra lỗi." },
      { status: 500 },
    );
  }
}
