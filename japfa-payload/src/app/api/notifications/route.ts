import { NextResponse } from "next/server";
import { getPayload, type Where } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";

export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unread") === "true";
    const requestedLimit = Number(url.searchParams.get("limit") || 50);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 50;
    const where: Where = unreadOnly
      ? {
          and: [
            { recipient: { equals: user.id } },
            { isRead: { equals: false } },
          ],
        }
      : { recipient: { equals: user.id } };

    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "notifications",
      where,
      limit,
      sort: "-createdAt",
      depth: 1,
      overrideAccess: false,
      user,
    });
    const unread = await payload.find({
      collection: "notifications",
      where: {
        and: [
          { recipient: { equals: user.id } },
          { isRead: { equals: false } },
        ],
      },
      limit: 0,
      depth: 0,
      overrideAccess: false,
      user,
    });

    return NextResponse.json({
      success: true,
      data: {
        docs: result.docs,
        totalDocs: result.totalDocs,
        unreadCount: unread.totalDocs,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/notifications", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Đã xảy ra lỗi." },
      { status: 500 },
    );
  }
}
