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
import { dateKey } from "@/utils/date";
import { buildForecastRows } from "@/domains/fms/feed-forecast";

export async function updateFmsMort(
  payload: PayloadClient,
  user: AuthUser,
  body: Record<string, any>,
) {
  requireRole(user, ["ADMIN", "TECHNICAL", "OPS"]);
  const flockId = requiredText(body.flock_id, "Flock");
  const targetDate = dateKey(requiredText(body.date, "Ngày"));
  const mortAct = Number(body.mort_act);
  if (!targetDate) throw new ApiError("Ngày dữ liệu FMS không hợp lệ.");
  if (targetDate > dateKey(new Date()))
    throw new ApiError(
      "Chỉ được cập nhật số liệu cho ngày đã diễn ra hoặc hôm nay.",
    );
  if (!Number.isFinite(mortAct) || mortAct < 0 || !Number.isInteger(mortAct))
    throw new ApiError("Lượng chết phải là số nguyên không âm.");

  const flock = await findOneByField(
    payload,
    "flocks",
    "flockId",
    flockId,
    user,
  );
  if (!flock) throw new ApiError("Không tìm thấy Flock.", 404);
  const logs = await payload.find({
    collection: "fms-daily-logs",
    where: { flock: { equals: flock.id } },
    limit: 1000,
    pagination: false,
    depth: 0,
    user: user as never,
    overrideAccess: false,
  });
  const candidates = (logs.docs as any[]).filter(
    (log) => dateKey(log.date) === targetDate,
  );
  const target =
    candidates.find(
      (log) => String(log.feedState).toLowerCase() === "actual",
    ) || candidates[0];
  if (!target) throw new ApiError("Không tìm thấy dòng FMS để cập nhật.", 404);

  return payload.update({
    collection: "fms-daily-logs",
    id: target.id,
    data: { mortAct },
    user: user as never,
    overrideAccess: false,
  });
}

export async function farmOrderSuggest(
  payload: PayloadClient,
  user: AuthUser,
  body: Record<string, any>,
) {
  requireRole(user, ["ADMIN", "PROCUREMENT"]);
  const flockId = requiredText(body.flock_id, "Flock");
  const storageDays = Number(body.storage_days);
  if (
    !Number.isFinite(storageDays) ||
    storageDays < 0 ||
    !Number.isInteger(storageDays)
  )
    throw new ApiError("Storage Days phải là số nguyên lớn hơn hoặc bằng 0.");

  const flock = await findOneByField(
    payload,
    "flocks",
    "flockId",
    flockId,
    user,
  );
  if (!flock) throw new ApiError("Không tìm thấy cấu hình Flock.", 404);

  const logs = await payload.find({
    collection: "fms-daily-logs",
    where: { flock: { equals: flock.id } },
    limit: 1000,
    pagination: false,
    depth: 1,
    sort: "date",
    user: user as never,
    overrideAccess: false,
  });
  if (!logs.docs.length)
    throw new ApiError("Chưa có dữ liệu FMS cho Flock đã chọn.");

  const today = dateKey(new Date());
  const chickenType = String((flock as any).chickenType || "").trim();
  const feedStandards = chickenType
    ? (
        await payload.find({
          collection: "feed-standards",
          limit: 10000,
          pagination: false,
          depth: 0,
          user: user as never,
          overrideAccess: false,
        })
      ).docs
    : [];
  const policies = (
    await payload.find({
      collection: "policy-thresholds",
      limit: 1000,
      pagination: false,
      depth: 0,
      user: user as never,
      overrideAccess: false,
    })
  ).docs as any[];

  const projectedRows = buildForecastRows({
    logs: logs.docs as any[],
    flockId,
    chickenType,
    feedStandards: feedStandards as any[],
    policies,
    today,
  });
  if (!projectedRows.length)
    throw new ApiError("Chưa có dữ liệu FMS hợp lệ cho Flock đã chọn.");

  const current =
    [...projectedRows].reverse().find((row) => dateKey(row.date) <= today) ||
    projectedRows[0];
  const depletedIndex = projectedRows.findIndex((row) => {
    if (
      row.stock_level_percentage === null ||
      row.stock_level_percentage === undefined ||
      row.stock_level_percentage === ""
    )
      return false;
    const percentage = Number(row.stock_level_percentage);
    return Number.isFinite(percentage) && percentage <= 0;
  });
  if (depletedIndex <= 0)
    throw new ApiError("Không tìm thấy Date 2 từ dữ liệu forecast FMS.");

  const date2 = new Date(String(projectedRows[depletedIndex - 1].date));
  const referenceDate = new Date(date2);
  referenceDate.setUTCDate(referenceDate.getUTCDate() + storageDays);
  const referenceKey = dateKey(referenceDate);
  const referenceRow = projectedRows.find(
    (row) => dateKey(row.date) === referenceKey,
  );
  if (!referenceRow)
    throw new ApiError("Không tìm thấy tồn kho dự kiến tại ngày tham chiếu.");

  const projectedEndQtyKg = Number(referenceRow.feed_end_qtty);
  if (!Number.isFinite(projectedEndQtyKg))
    throw new ApiError("Tồn kho dự kiến tại ngày tham chiếu không hợp lệ.");
  const suggestedQtyKg =
    projectedEndQtyKg < 0 ? Math.abs(projectedEndQtyKg) : 0;
  const feedName = String(current.feed_name || "").trim();
  if (!feedName) throw new ApiError("Dữ liệu FMS chưa có tên thức ăn.");

  const products = await payload.find({
    collection: "products",
    where: { name: { equals: feedName } },
    limit: 100,
    pagination: false,
    depth: 0,
    user: user as never,
    overrideAccess: false,
  });
  const farm = await payload.findByID({
    collection: "tenants",
    id: flock.tenant,
    depth: 0,
    user: user as never,
    overrideAccess: false,
  });
  const packageProducts = products.docs.filter((product: any) =>
    /_bag_\d+$/i.test(String(product.sku || "")),
  );
  const packageOptions = packageProducts.length
    ? packageProducts
    : products.docs;

  return {
    flockId,
    flockName: flock.flockName || flockId,
    flockGroup: (flock as any).sourceFlockGroup || "",
    tenantId: (farm as any).tenantId,
    farmName: (farm as any).managedBy || (farm as any).name,
    managedBy: (farm as any).managedBy || "",
    feedName,
    date2: dateKey(date2),
    referenceDate: referenceKey,
    projectedEndQtyKg,
    suggestedQtyKg,
    isEnoughUntilRefDate: projectedEndQtyKg > 0,
    storageDays,
    packages: packageOptions.map((product: any) => ({
      sku: product.sku,
      uom: product.uom,
      uomWeightKg: Number(product.uomWeightKg) || 0,
    })),
  };
}

export async function farmOrderPackage(
  payload: PayloadClient,
  user: AuthUser,
  body: Record<string, any>,
) {
  requireRole(user, ["ADMIN", "PROCUREMENT"]);
  const suggestedQtyKg = positiveNumber(
    body.suggested_qty_kg,
    "Suggested Quantity",
  );
  const packagingSku = requiredText(body.packaging_sku, "Packaging SKU");
  const product = await findOneByField(
    payload,
    "products",
    "sku",
    packagingSku,
    user,
  );
  if (!product) throw new ApiError("Không tìm thấy Packaging SKU.", 404);
  const uomWeightKg = positiveNumber(product.uomWeightKg, "UOM weight");
  return {
    packagingSku,
    uom: product.uom || "Bag",
    uomWeightKg,
    suggestedQtyKg,
    suggestedBags: Math.ceil(suggestedQtyKg / uomWeightKg),
  };
}
