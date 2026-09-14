import { NextResponse } from "next/server";
import { getPayload, type Where } from "payload";
import config from "@payload-config";
import { isAdmin } from "@/access/roles";
import { getAppUser } from "@/server/auth";

export async function GET(request: Request) {
  try {
    const actor = await getAppUser();
    if (!actor) return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Vui lòng đăng nhập." }, { status: 401 });
    if (!isAdmin(actor.role)) return NextResponse.json({ success: false, error: "FORBIDDEN", message: "Chỉ ADMIN xem audit logs." }, { status: 403 });

    const url = new URL(request.url);
    const and: Where[] = [];
    const action = url.searchParams.get("action");
    const actorUserId = url.searchParams.get("actorUserId");
    const targetCollection = url.searchParams.get("targetCollection");
    const targetId = url.searchParams.get("targetId");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200);
    const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
    if (action) and.push({ action: { equals: action } });
    if (actorUserId) and.push({ actorUserId: { equals: Number(actorUserId) } });
    if (targetCollection) and.push({ targetCollection: { equals: targetCollection } });
    if (targetId) and.push({ targetId: { equals: targetId } });
    if (from || to) and.push({ timestamp: { ...(from ? { greater_than_equal: from } : {}), ...(to ? { less_than_equal: to } : {}) } });

    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "audit-logs",
      where: and.length ? { and } : undefined,
      limit, page, sort: "-timestamp", depth: 1, overrideAccess: false, user: actor,
    });
    return NextResponse.json({ success: true, data: { docs: result.docs, totalDocs: result.totalDocs, page: result.page, totalPages: result.totalPages, hasNextPage: result.hasNextPage, hasPrevPage: result.hasPrevPage } });
  } catch (error) {
    console.error("[API] GET /api/admin/audit-logs", error);
    return NextResponse.json({ success: false, error: "INTERNAL_ERROR", message: "Đã xảy ra lỗi." }, { status: 500 });
  }
}
