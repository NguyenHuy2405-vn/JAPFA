import {
  findOneByField,
  upsertCollection,
  type PayloadClient,
} from "@/repositories/payload.repository";
import { ApiError, requireRole, type AuthUser } from "@/server/http/api-error";

export type UpsertSetupBody = {
  sub: "account" | "product" | "feed" | "policy";
  data?: Record<string, any>;
  confirmUpdate?: boolean;
  updatedBy?: string;
};

const normalizeTextKey = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const sanitizeSkuPart = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, "_");

const buildProductSku = (name: string, uom: string, uomWeightKg: number) =>
  `${sanitizeSkuPart(name)}_${sanitizeSkuPart(uom)}_${uomWeightKg}`;

const findProductByCompositeKey = (
  products: any[],
  name: string,
  uom: string,
  uomWeightKg: number,
) =>
  products.find(
    (product: any) =>
      normalizeTextKey(product.name) === normalizeTextKey(name) &&
      normalizeTextKey(product.uom) === normalizeTextKey(uom) &&
      Number(product.uomWeightKg) === uomWeightKg,
  ) as any;

async function upsertAccount(
  payload: PayloadClient,
  user: AuthUser,
  data: Record<string, any>,
  confirmUpdate: boolean,
  updatedBy?: string,
) {
  const block = String(data.block || "")
    .trim()
    .toLowerCase();

  // FLOCK accounts live in the `flocks` collection, linked to an existing
  // Farm tenant (chosen from a select, not typed in).
  if (block === "flock") {
    const {
      farm_tenant_id,
      source_group = "",
      flock_id,
      flock_name = "",
      standards_applied = "",
      start_flock_count = null,
      start_flock_date = null,
    } = data;
    if (!farm_tenant_id || !flock_id)
      throw new Error("Farm và Mã đàn gà là bắt buộc.");
    const farm = await findOneByField(
      payload,
      "tenants",
      "tenantId",
      farm_tenant_id,
      user,
    );
    if (!farm) throw new Error("Không tìm thấy Farm đã chọn.");
    const chickenType =
      String(standards_applied || "")
        .split(",")[0]
        ?.trim() || "Unknown";
    return upsertCollection(
      payload,
      "flocks",
      "flockId",
      flock_id,
      {
        tenant: farm.id,
        chickenType,
        initialBirdCount: Number(start_flock_count) || 0,
        startDate: start_flock_date || new Date().toISOString(),
        flockName: flock_name,
        sourceFlockGroup: source_group,
        standardsApplied: standards_applied,
      },
      confirmUpdate,
      user,
    );
  }

  // TRANSPORT / FACTORY / FARM accounts are `tenants`.
  const {
    system,
    tenant,
    tenant_id,
    managed_by = "",
    address_of_tenant = "",
  } = data;
  if (!system || !tenant || !tenant_id)
    throw new Error("SYSTEM, Tenant và Tenant_id là bắt buộc.");
  const type =
    block === "farm"
      ? "FARM"
      : block === "factory" || block === "transport"
        ? "FACTORY"
        : "FACTORY";
  return upsertCollection(
    payload,
    "tenants",
    "tenantId",
    tenant_id,
    {
      system,
      name: tenant,
      managedBy: managed_by,
      addressOfTenant: address_of_tenant,
      updatedBy: updatedBy || "payload",
      type,
    },
    confirmUpdate,
    user,
  );
}

async function upsertProduct(
  payload: PayloadClient,
  user: AuthUser,
  data: Record<string, any>,
  confirmUpdate: boolean,
) {
  const {
    ten_hang_hoa,
    loai_san_pham = "Chicken_feed",
    uom = "Bao",
    uom_weight_kg,
    status = "ACTIVE",
  } = data;
  const name = String(ten_hang_hoa || "").trim();
  const unit = String(uom || "").trim();
  const unitWeight = Number(uom_weight_kg);

  if (!name || !unit || !Number.isFinite(unitWeight) || unitWeight <= 0)
    throw new Error("Tên hàng hóa, UOM và trọng lượng hợp lệ là bắt buộc.");

  const existingProducts = await payload.find({
    collection: "products",
    limit: 1000,
    pagination: false,
    depth: 0,
    user: user as never,
    overrideAccess: false,
  });
  const productDocs = existingProducts.docs as any[];

  const existing = findProductByCompositeKey(
    productDocs,
    name,
    unit,
    unitWeight,
  );

  if (existing && !confirmUpdate) {
    throw new Error(
      `DUPLICATE_KEY: Sản phẩm [${name} / ${unit} / ${unitWeight}kg] đã tồn tại với SKU=${existing.sku}. Cần xác nhận cập nhật.`,
    );
  }

  if (existing) {
    return payload.update({
      collection: "products",
      id: existing.id,
      data: {
        productType: loai_san_pham || existing.productType || "Chicken_feed",
        status: status || existing.status || "ACTIVE",
      },
      user: user as never,
      overrideAccess: false,
    });
  }

  const sku = buildProductSku(name, unit, unitWeight);
  const skuConflict = productDocs.find(
    (product: any) => normalizeTextKey(product.sku) === normalizeTextKey(sku),
  );
  if (skuConflict) {
    throw new Error(
      `SKU_CONFLICT: SKU tự động sinh (${sku}) đã tồn tại, vui lòng chuẩn hóa lại tên hàng/UOM/trọng lượng.`,
    );
  }

  return payload.create({
    collection: "products",
    data: {
      sku,
      name,
      productType: loai_san_pham,
      uom: unit,
      uomWeightKg: unitWeight,
      status,
    },
    user: user as never,
    overrideAccess: false,
  });
}

async function upsertFeedStandard(
  payload: PayloadClient,
  user: AuthUser,
  data: Record<string, any>,
  confirmUpdate: boolean,
) {
  const {
    loai_ga,
    ngay_tuoi,
    ta_su_dung_g_c_n,
    thuc_an_su_dung_cong_don_g_c = null,
    he_so_su_dung_thuc_an = null,
    hao_hut_cong_don = null,
    binh_quan_khoi_luong_co_the_g = null,
    loai_cam = "",
  } = data;
  if (!loai_ga || Number(ngay_tuoi) < 0 || !loai_cam)
    throw new Error("Loại gà, ngày tuổi và loại cám là bắt buộc.");
  const migrationKey = `feed:${loai_ga}:${Number(ngay_tuoi)}`;
  return upsertCollection(
    payload,
    "feed-standards",
    "migrationKey",
    migrationKey,
    {
      chickenType: loai_ga,
      ageInDays: Number(ngay_tuoi),
      feedQtyPerBirdPerDay: Number(ta_su_dung_g_c_n || 0),
      cumFeedQty: thuc_an_su_dung_cong_don_g_c,
      fcr: he_so_su_dung_thuc_an,
      cumDepPercent: hao_hut_cong_don,
      bwGr: binh_quan_khoi_luong_co_the_g,
      feedName: loai_cam,
    },
    confirmUpdate,
    user,
  );
}

async function upsertPolicyThreshold(
  payload: PayloadClient,
  user: AuthUser,
  data: Record<string, any>,
  confirmUpdate: boolean,
) {
  const {
    ma_hang,
    zero_threshold,
    critical_threshold,
    low_threshold,
    high_threshold,
    status = "active",
    note = "",
  } = data;
  const thresholdValue = (value: unknown) =>
    Number(
      String(value ?? "")
        .replace(/%/g, "")
        .trim(),
    );
  const zero = thresholdValue(zero_threshold);
  const critical = thresholdValue(critical_threshold);
  const low = thresholdValue(low_threshold);
  const high = thresholdValue(high_threshold);
  if (!ma_hang || !(zero < critical && critical < low && low <= high))
    throw new Error("Ngưỡng phải theo thứ tự zero < critical < low <= high.");
  return upsertCollection(
    payload,
    "policy-thresholds",
    "sku",
    ma_hang,
    {
      minStockDays: 0,
      zeroThreshold: zero,
      criticalStockThreshold: critical,
      lowStockThreshold: low,
      highThreshold: high,
      status,
      note,
    },
    confirmUpdate,
    user,
  );
}

/** POST action=upsert_setup — create-or-update master data rows (Tenants/Flocks/Products/FeedStandards/PolicyThresholds). */
export async function upsertSetup(
  payload: PayloadClient,
  user: AuthUser,
  body: UpsertSetupBody,
) {
  requireRole(user, ["ADMIN"]);
  const { sub, data = {}, confirmUpdate = false, updatedBy } = body;
  if (!sub || !["account", "product", "feed", "policy"].includes(sub))
    throw new ApiError("Invalid setup section");

  if (sub === "account")
    return upsertAccount(payload, user, data, confirmUpdate, updatedBy);
  if (sub === "product")
    return upsertProduct(payload, user, data, confirmUpdate);
  if (sub === "feed")
    return upsertFeedStandard(payload, user, data, confirmUpdate);
  return upsertPolicyThreshold(payload, user, data, confirmUpdate);
}
