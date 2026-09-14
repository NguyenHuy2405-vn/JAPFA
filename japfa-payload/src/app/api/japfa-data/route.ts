/**
 * @deprecated Legacy API for tab-based LegacyDashboardView.
 *
 * Use role-specific APIs instead:
 * - ADMIN: /api/admin/farms, /api/admin/audit-logs
 * - OPERATION: /api/orders, /api/transfers
 * - FARM: /api/wms-transactions, /api/fms-daily-logs
 *
 * Will be removed in Phase 11.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import { findSetupRows } from "@/server/setup";
import { toApiResponse, type AuthUser } from "@/server/http/api-error";
import { listOrders } from "@/services/oms/oms.query.service";
import {
  assignTmsUnfinished,
  createOrder,
  mergeOrdersTms,
  orderMergeSuggestions,
  traceOrder,
  updateOrder,
  updateOrderStatus,
} from "@/services/oms/oms.command.service";
import { getWmsInventory } from "@/services/wms/wms.query.service";
import {
  adjustWms,
  createWmsTransaction,
} from "@/services/wms/wms.command.service";
import { getFmsLog } from "@/services/fms/fms.query.service";
import {
  farmOrderPackage,
  farmOrderSuggest,
  updateFmsMort,
} from "@/services/fms/fms.command.service";
import { upsertSetup } from "@/services/setup/setup.command.service";

// This route is a thin HTTP controller: parse request -> call one service ->
// serialize the result. All business logic lives under src/services/**.

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const auth = { user: await getAppUser() };
    if (!auth.user)
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "oms";

    if (tab === "oms") {
      const data = await listOrders(payload, auth.user as AuthUser, {
        status: searchParams.get("status") || "ALL",
        search: searchParams.get("search") || "",
      });
      return NextResponse.json({ success: true, data });
    }

    if (tab === "wms") {
      const { scope, data, currentInfo } = await getWmsInventory(
        payload,
        auth.user as AuthUser,
        {
          scope: searchParams.get("scope") || "farm",
          tenantId: searchParams.get("tenantId") || "",
          flockId: searchParams.get("flockId") || "",
        },
      );
      return NextResponse.json({ success: true, scope, data, currentInfo });
    }

    if (tab === "fms") {
      const { data, summary, chart } = await getFmsLog(
        payload,
        auth.user as AuthUser,
        {
          tenantId: searchParams.get("tenantId") || "",
          flockId: searchParams.get("flockId") || "",
        },
      );
      return NextResponse.json({ success: true, data, summary, chart });
    }

    if (tab === "setup") {
      const sub = searchParams.get("sub") || "account";
      if (!["account", "product", "feed", "policy", "standard"].includes(sub)) {
        return NextResponse.json(
          { success: false, error: "Invalid setup section" },
          { status: 400 },
        );
      }
      const data = await findSetupRows(
        payload,
        sub as "account" | "product" | "feed" | "policy" | "standard",
        {
          search: searchParams.get("search") || "",
          block: searchParams.get("block") || "",
          system: searchParams.get("system") || "",
          tenant: searchParams.get("tenant") || "",
          tenantId: searchParams.get("tenantId") || "",
          address: searchParams.get("address") || "",
          flockId: searchParams.get("flockId") || "",
          flockName: searchParams.get("flockName") || "",
          chicken: searchParams.get("chicken") || "",
          feedType: searchParams.get("feedType") || "",
          age: searchParams.get("age") || "",
        },
        auth.user,
      );
      return NextResponse.json({ success: true, sub, data });
    }

    return NextResponse.json(
      { success: false, error: "Invalid tab" },
      { status: 400 },
    );
  } catch (err: any) {
    const { status, body } = toApiResponse(err, "GET Japfa Data Error:");
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const auth = { user: await getAppUser() };
    if (!auth.user)
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    const body = await req.json();
    const { action } = body;

    if (action === "update_fms_mort") {
      const updated = await updateFmsMort(payload, auth.user as AuthUser, body);
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "farm_order_suggest") {
      const data = await farmOrderSuggest(payload, auth.user as AuthUser, body);
      return NextResponse.json({ success: true, data });
    }

    if (action === "farm_order_package") {
      const data = await farmOrderPackage(payload, auth.user as AuthUser, body);
      return NextResponse.json({ success: true, data });
    }

    if (action === "create_order") {
      const order = await createOrder(payload, auth.user as AuthUser, body);
      return NextResponse.json({ success: true, order });
    }

    if (action === "update_order") {
      const order = await updateOrder(payload, auth.user as AuthUser, body);
      return NextResponse.json({ success: true, order });
    }

    if (action === "create_wms_txn") {
      const txn = await createWmsTransaction(
        payload,
        auth.user as AuthUser,
        body,
      );
      return NextResponse.json({ success: true, txn });
    }

    if (action === "update_order_status") {
      const order = await updateOrderStatus(
        payload,
        auth.user as AuthUser,
        body,
      );
      return NextResponse.json({ success: true, order });
    }

    if (action === "trace_order") {
      const result = await traceOrder(payload, auth.user as AuthUser, body);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "order_merge_suggestions") {
      const suggestions = await orderMergeSuggestions(
        payload,
        auth.user as AuthUser,
      );
      return NextResponse.json({ success: true, suggestions });
    }

    if (action === "merge_orders_tms") {
      const assignments = await mergeOrdersTms(
        payload,
        auth.user as AuthUser,
        body,
      );
      return NextResponse.json({ success: true, assignments });
    }

    if (action === "assign_tms_unfinished") {
      const assignments = await assignTmsUnfinished(
        payload,
        auth.user as AuthUser,
      );
      return NextResponse.json({ success: true, assignments });
    }

    if (action === "adjust_wms") {
      const txn = await adjustWms(payload, auth.user as AuthUser, body);
      return NextResponse.json({ success: true, txn });
    }

    if (action === "upsert_setup") {
      const data = await upsertSetup(payload, auth.user as AuthUser, body);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 },
    );
  } catch (err: any) {
    const { status, body } = toApiResponse(err, "POST Japfa Data Error:");
    return NextResponse.json(body, { status });
  }
}
