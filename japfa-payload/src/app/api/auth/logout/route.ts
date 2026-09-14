import { NextResponse } from "next/server";
import { clearSession } from "@/server/auth";

export async function POST() {
  await clearSession();
  // LEGACY: ok field included for backward compatibility, remove Phase 7
  return NextResponse.json({
    success: true,
    ok: true, // @deprecated Legacy compatibility field. Remove in Phase 11.
    data: {
      message: "Đăng xuất thành công.",
    },
  });
}
