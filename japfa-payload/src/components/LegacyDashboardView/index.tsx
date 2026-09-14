/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

import React from "react";
import { getPayload } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import type {
  Config,
  Flock,
  FmsDailyLog,
  Order,
  Product,
  Tenant,
  User,
  WmsTransaction,
} from "../../../payload-types";
import { DashboardClient } from "./DashboardClient";
import "./dashboard.css";

interface AlertItem {
  id: string;
  date: string;
  tenantId: string;
  farmName: string;
  flockId: string;
  feedName: string;
  status: string;
  currentDay: number;
}

interface OrderView {
  id: number;
  orderId: string;
  tenantId: string;
  createDate: string;
  pickupDate: string;
  client: string;
  sku: string;
  quantity: number;
  uom: string;
  origin: string;
  destination: string;
  location: string;
  flockId: string;
  estDeliveryDate: string;
  actDeliveryDate: string;
  status: string;
  tmsOrderId: string;
  note: string;
}

interface TransactionView {
  id: string;
  date: string;
  tenantId: string;
  flockId: string;
  sku: string;
  txnType: string;
  product: string;
  qtyIn: number;
  qtyOut: number;
  endQty: number | string;
  quantity: number;
  uom: string;
  note: string;
}

interface FactoryInventoryView {
  id: string;
  sku: string;
  bags: number;
  lastDate: string;
  status: string;
}

interface FarmInventoryView {
  id: string;
  flockId: string;
  feedName: string;
  endQty: number;
  lastTransactionDate: string;
  status: string;
}

const docs = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  collection: keyof Config["collections"],
  user: User,
) =>
  (
    await payload.find({
      collection,
      limit: 1000,
      pagination: false,
      depth: 1,
      user,
      overrideAccess: false,
    })
  ).docs;

const relation = (value: unknown, field: string): unknown =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)[field]
    : value;
const recordId = (value: unknown): number | undefined => {
  if (typeof value === "number") return value;
  const id = relation(value, "id");
  return typeof id === "number" ? id : undefined;
};
const textValue = (value: unknown, fallback = "") =>
  typeof value === "string" || typeof value === "number"
    ? String(value)
    : fallback;
const numberValue = (value: unknown) => {
  const result = Number(
    String(value ?? "")
      .replace(/%|,/g, "")
      .trim(),
  );
  return Number.isFinite(result) ? result : 0;
};

const normalizeTenantCode = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

const DASHBOARD_ALERT_TENANTS = [
  "FLOCK_11",
  "FLOCK_12",
  "FLOCK_21",
  "FLOCK_22",
] as const;

export async function LegacyDashboardView() {
  const payload = await getPayload({ config });
  const user = await getAppUser();
  if (!user) return null;
  let orderCounts = { PLANNED: 0, PICKED_UP: 0, IN_TRANSIT: 0, COMPLETED: 0 };
  let totalOrders = 0;
  let fmsAlertCount = 0;
  let factorySkuCount = 0;
  let farmSkuCount = 0;
  let alertLogs: AlertItem[] = [];
  let factoryTxns: TransactionView[] = [];
  let farmTxns: TransactionView[] = [];
  let omsOrdersList: OrderView[] = [];
  let factoryInventoryList: FactoryInventoryView[] = [];
  let farmInventoryList: FarmInventoryView[] = [];
  let flocksList: string[] = [];
  let tenantOptions: Array<{
    id: number | string;
    tenantId: string;
    name: string;
    type?: string;
    system?: string;
    managedBy?: string;
  }> = [];
  let productOptions: Array<{
    id: number | string;
    sku: string;
    name: string;
  }> = [];
  let flockOptions: Array<{
    id: number | string;
    flockId: string;
    name?: string;
    tenantId?: string;
  }> = [];

  try {
    const [orders, tenants, products, transactions, fmsLogs, flocks] =
      await Promise.all([
        docs(payload, "orders", user) as Promise<Order[]>,
        docs(payload, "tenants", user) as Promise<Tenant[]>,
        docs(payload, "products", user) as Promise<Product[]>,
        docs(payload, "wms-transactions", user) as Promise<WmsTransaction[]>,
        docs(payload, "fms-daily-logs", user) as Promise<FmsDailyLog[]>,
        docs(payload, "flocks", user) as Promise<Flock[]>,
      ]);
    const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
    const flockById = new Map(flocks.map((flock) => [flock.id, flock]));
    tenantOptions = tenants.map((tenant) => ({
      id: tenant.id,
      tenantId: tenant.tenantId,
      name: tenant.name,
      type: tenant.type,
      system: tenant.system || undefined,
      managedBy: tenant.managedBy || undefined,
    }));
    productOptions = products.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
    }));
    flockOptions = flocks.map((flock: any) => ({
      id: flock.id,
      flockId: flock.flockId,
      name: flock.flockName,
      groupId: flock.sourceFlockGroup,
      tenantId: typeof flock.tenant === "object" ? flock.tenant.tenantId : "",
    }));

    orders.forEach((order) => {
      totalOrders += 1;
      const status = String(
        order.status || "PLANNED",
      ).toUpperCase() as keyof typeof orderCounts;
      orderCounts[status] = (orderCounts[status] || 0) + 1;
    });
    omsOrdersList = orders.map((order) => ({
      id: order.id,
      orderId: order.orderId,
      tenantId: textValue(relation(order.tenant, "tenantId"), "-"),
      createDate: order.createDate || order.createdAt || "-",
      pickupDate: order.pickupDate || "-",
      client: order.client || "-",
      sku: textValue(relation(order.product, "sku"), "-"),
      quantity: order.quantity || 0,
      uom: order.uom || "Bao",
      origin:
        textValue(relation(order, "originDisplay")) ||
        textValue(relation(order.origin, "managedBy")) ||
        textValue(relation(order.origin, "name"), "-"),
      destination:
        textValue(relation(order, "destinationDisplay")) ||
        textValue(relation(order.destination, "managedBy")) ||
        textValue(relation(order.destination, "name"), "-"),
      location: order.location || "-",
      flockId: textValue(relation(order.flock, "flockId"), "-"),
      estDeliveryDate: order.expectedDeliveryDate || "-",
      actDeliveryDate: order.actualDeliveryDate || "-",
      status: order.status || "PLANNED",
      tmsOrderId: order.tmsOrderId || "-",
      note: order.note || "",
    }));

    const statusRank: Record<string, number> = { ZERO: 3, CRITICAL: 2, LOW: 1 };
    const alertMap = new Map<string, any>();
    fmsLogs.forEach((log) => {
      const status = String(log.badgeStatus || "NORMAL").toUpperCase();
      const day = numberValue(log.currentDay);
      const sourceTenant = normalizeTenantCode(log.sourceTenantId);
      if (
        !DASHBOARD_ALERT_TENANTS.includes(
          sourceTenant as (typeof DASHBOARD_ALERT_TENANTS)[number],
        )
      )
        return;
      if (!statusRank[status] || day < 0 || day > 7) return;
      const flock =
        relation(log.flock, "flockId") ||
        flockById.get(recordId(log.flock) || 0)?.flockId ||
        "-";
      const tenant = normalizeTenantCode(
        sourceTenant ||
          relation(log.tenant, "tenantId") ||
          tenantById.get(recordId(log.tenant) || 0)?.tenantId ||
          "-",
      );
      const key = `${tenant}|${day}`;
      const item = {
        id: `fms-alert-${key}`,
        date: log.date,
        currentDay: day,
        tenantId: tenant,
        farmName: tenant,
        flockId: flock,
        feedName: relation(log.feedProduct, "name") || "-",
        status,
      };
      if (
        !alertMap.has(key) ||
        statusRank[status] > statusRank[alertMap.get(key).status]
      )
        alertMap.set(key, item);
    });
    alertLogs = [...alertMap.values()].sort(
      (a, b) =>
        a.tenantId.localeCompare(b.tenantId) || a.currentDay - b.currentDay,
    );
    fmsAlertCount = alertLogs.length;
    // Dashboard Apps Script filters by source Tenant_id, not operational
    // FLOCK_ID values such as CKMN0545/0004.
    flocksList = [...DASHBOARD_ALERT_TENANTS];

    const factory = transactions.filter(
      (transaction) => transaction.scope === "FACTORY",
    );
    const farm = transactions.filter(
      (transaction) => transaction.scope === "FARM",
    );
    const latest = (items: any[]) => {
      const result = new Map<string, any>();
      items.forEach((item) => {
        const sku =
          textValue(relation(item.product, "sku"), "-") ||
          productById.get(item.product)?.sku ||
          "-";
        const flock =
          textValue(relation(item.flock, "flockId")) ||
          flockById.get(recordId(item.flock) || 0)?.flockId ||
          "";
        const key = `${flock}|${sku}`;
        const current = result.get(key);
        const itemTime = new Date(
          String(item.date || item.createdAt || ""),
        ).getTime();
        const currentTime = current
          ? new Date(
              String(current.item.date || current.item.createdAt || ""),
            ).getTime()
          : -Infinity;
        if (!current || itemTime >= currentTime) {
          result.set(key, { item, sku, flock });
        }
      });
      return [...result.values()];
    };
    const factoryLatest = latest(factory);
    const farmLatest = latest(farm);
    factorySkuCount = new Set(factoryLatest.map((row) => row.sku)).size;
    farmSkuCount = farmLatest.length;
    factoryInventoryList = factoryLatest.map(({ item, sku }, index) => ({
      id: `factory-${index}`,
      sku,
      bags: numberValue(item.endQuantity),
      lastDate: item.date || "-",
      status: "-",
    }));
    farmInventoryList = farmLatest.map(({ item, sku, flock }, index) => ({
      id: `farm-${index}`,
      flockId: flock,
      feedName: sku,
      endQty: numberValue(item.endQuantity),
      lastTransactionDate: item.date || "-",
      status: "-",
    }));
    const transactionView = (item: any, index: number, isFarm: boolean) => ({
      id: `${isFarm ? "farm" : "factory"}-${item.id || index}`,
      date: item.date || "-",
      tenantId:
        textValue(relation(item.tenant, "tenantId")) ||
        tenantById.get(recordId(item.tenant) || 0)?.tenantId ||
        "-",
      flockId:
        textValue(relation(item.flock, "flockId")) ||
        flockById.get(recordId(item.flock) || 0)?.flockId ||
        "-",
      sku:
        textValue(relation(item.product, "sku")) ||
        productById.get(recordId(item.product) || 0)?.sku ||
        "-",
      txnType: item.txnType || "-",
      product: textValue(relation(item.product, "name"), "-"),
      qtyIn:
        item.inQuantity ?? (item.txnType === "INBOUND" ? item.quantity : 0),
      qtyOut:
        item.outQuantity ?? (item.txnType === "OUTBOUND" ? item.quantity : 0),
      endQty: item.endQuantity ?? "-",
      quantity: item.quantity || 0,
      uom: "Bao",
      note: item.note || item.reason || "",
    });
    const recentFactory = [...factory].sort(
      (left, right) =>
        new Date(String(right.date || right.createdAt || "")).getTime() -
        new Date(String(left.date || left.createdAt || "")).getTime(),
    );
    factoryTxns = recentFactory
      .slice(0, 12)
      .map((item, index) => transactionView(item, index, false));
    farmTxns = farm
      .slice(0, 20)
      .map((item, index) => transactionView(item, index, true));
  } catch (error) {
    console.error("Error loading Payload dashboard data:", error);
  }

  return (
    <div className="japfa-dashboard-container">
      <DashboardClient
        userRole={String(user.role || "VIEWER")}
        tenantOptions={tenantOptions}
        productOptions={productOptions}
        flockOptions={flockOptions}
        orderCounts={orderCounts}
        totalOrders={totalOrders}
        fmsAlertCount={fmsAlertCount}
        factorySkuCount={factorySkuCount}
        farmSkuCount={farmSkuCount}
        fmsAlerts={alertLogs}
        recentFactoryTxns={factoryTxns}
        recentFarmTxns={farmTxns}
        flocksList={flocksList}
        omsOrdersList={omsOrdersList}
        factoryInventoryList={factoryInventoryList}
        farmInventoryList={farmInventoryList}
      />
    </div>
  );
}

export default LegacyDashboardView;
