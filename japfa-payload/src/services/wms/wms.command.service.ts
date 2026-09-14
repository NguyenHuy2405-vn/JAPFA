import {
  findOneByField,
  type PayloadClient,
} from "@/repositories/payload.repository";
import {
  ApiError,
  requireRole,
  requiredText,
  positiveNumber,
  type AuthUser,
} from "@/server/http/api-error";
import { calculateLedgerAmounts } from "@/domains/inventory/ledger";
import { VALID_ADJUSTMENT_REASONS } from "@/domains/inventory/adjustment-reasons";

const resolveTxnType = (loaiGiaoDich: unknown) =>
  loaiGiaoDich === "Inbound"
    ? "INBOUND"
    : loaiGiaoDich === "Outbound"
      ? "OUTBOUND"
      : loaiGiaoDich === "Consume"
        ? "CONSUME"
        : loaiGiaoDich === "Loss"
          ? "LOSS"
          : "ADJUSTMENT";

export async function createWmsTransaction(
  payload: PayloadClient,
  user: AuthUser,
  body: Record<string, any>,
) {
  const { scope, tenant_id, sku, so_luong, loai_giao_dich, flock_id, note } =
    body;
  requireRole(user, ["ADMIN", "INVENTORY", "OPS"]);
  const tenantId = requiredText(tenant_id, "Tenant");
  const productSku = requiredText(sku, "SKU");
  const quantity = positiveNumber(so_luong, "Số lượng");

  const tenant = await findOneByField(
    payload,
    "tenants",
    "tenantId",
    tenantId,
    user,
  );
  const product = await findOneByField(
    payload,
    "products",
    "sku",
    productSku,
    user,
  );
  if (!tenant || !product)
    throw new ApiError("Tenant và SKU phải tồn tại trong Payload.");
  const flock = flock_id
    ? await findOneByField(payload, "flocks", "flockId", flock_id, user)
    : undefined;
  if (String(scope).toUpperCase() === "FARM" && !flock)
    throw new ApiError("Flock phải tồn tại khi thao tác kho Farm.");
  if (flock && String(flock.tenant) !== String(tenant.id))
    throw new ApiError("Flock không thuộc Farm đã chọn.");

  const txnType = resolveTxnType(loai_giao_dich);
  const scopeValue =
    String(scope).toUpperCase() === "FARM" ? "FARM" : "FACTORY";
  const latest = await payload.find({
    collection: "wms-transactions",
    where: {
      and: [
        { scope: { equals: scopeValue } },
        { tenant: { equals: tenant.id } },
        { product: { equals: product.id } },
        ...(scopeValue === "FARM" && flock
          ? [{ flock: { equals: flock.id } }]
          : []),
      ],
    },
    limit: 1,
    depth: 0,
    sort: "-date",
    user: user as never,
    overrideAccess: false,
  });
  const currentQuantity = Number(latest.docs[0]?.endQuantity ?? 0);
  let amounts;
  try {
    amounts = calculateLedgerAmounts({
      beginQuantity: currentQuantity,
      quantity,
      txnType,
    });
  } catch (error) {
    throw new ApiError((error as Error).message, 409);
  }
  return payload.create({
    collection: "wms-transactions",
    data: {
      scope: scopeValue,
      tenant: tenant.id,
      flock: flock?.id,
      product: product.id,
      txnType,
      ...amounts,
      date: new Date().toISOString(),
      note: note || "Giao dịch từ UI",
    },
    user: user as never,
    overrideAccess: false,
  });
}

export async function adjustWms(
  payload: PayloadClient,
  user: AuthUser,
  body: Record<string, any>,
) {
  requireRole(user, ["ADMIN", "INVENTORY", "OPS"]);
  const scope =
    String(body.scope || "FARM").toUpperCase() === "FACTORY"
      ? "FACTORY"
      : "FARM";
  const tenantId = requiredText(body.tenant_id, "Tenant");
  const sku = requiredText(body.sku, "SKU");
  const flockId = body.flock_id ? requiredText(body.flock_id, "Flock") : "";
  const delta = Number(body.delta);
  const reason = requiredText(body.reason, "Lý do");
  if (!Number.isFinite(delta) || delta === 0)
    throw new ApiError("delta phải là số khác 0.");
  if (!VALID_ADJUSTMENT_REASONS.has(reason))
    throw new ApiError("Lý do điều chỉnh không hợp lệ.");

  const tenant = await findOneByField(
    payload,
    "tenants",
    "tenantId",
    tenantId,
    user,
  );
  const product = await findOneByField(payload, "products", "sku", sku, user);
  if (!tenant || !product)
    throw new ApiError("Tenant hoặc SKU không tồn tại.", 404);
  const flock = flockId
    ? await findOneByField(payload, "flocks", "flockId", flockId, user)
    : undefined;
  if (scope === "FARM" && !flock)
    throw new ApiError("Flock phải tồn tại khi điều chỉnh kho Farm.");
  if (flock && String(flock.tenant) !== String(tenant.id))
    throw new ApiError("Flock không thuộc Farm đã chọn.");

  const latest = await payload.find({
    collection: "wms-transactions",
    where: {
      and: [
        { scope: { equals: scope } },
        { tenant: { equals: tenant.id } },
        { product: { equals: product.id } },
        ...(scope === "FARM" && flock ? [{ flock: { equals: flock.id } }] : []),
      ],
    },
    limit: 1,
    depth: 0,
    sort: "-date",
    user: user as never,
    overrideAccess: false,
  });
  const beginQuantity = Number(latest.docs[0]?.endQuantity ?? 0);
  let amounts;
  try {
    amounts = calculateLedgerAmounts({
      beginQuantity,
      quantity: Math.abs(delta),
      txnType: "ADJUSTMENT",
      delta,
    });
  } catch (error) {
    throw new ApiError((error as Error).message, 400);
  }
  return payload.create({
    collection: "wms-transactions",
    data: {
      scope,
      tenant: tenant.id,
      flock: flock?.id,
      product: product.id,
      txnType: "ADJUSTMENT",
      ...amounts,
      reason,
      date: new Date().toISOString(),
      note: body.note || "Điều chỉnh từ Control Tower",
    } as never,
    user: user as never,
    overrideAccess: false,
  });
}
