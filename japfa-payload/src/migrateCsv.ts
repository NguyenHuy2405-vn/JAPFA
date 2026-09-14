import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { getPayload } from "payload";
import config from "../payload.config";

type Row = Record<string, string>;
type PayloadClient = Awaited<ReturnType<typeof getPayload>>;
type DocumentID = string | number;
type CsvSpec = {
  headerRow?: number;
  columns: readonly string[];
  required?: readonly string[];
};

const csvSpecs: Record<string, CsvSpec> = {
  "Config.csv": {
    columns: [
      "SYSTEM",
      "Tenant",
      "Tenant_id",
      "Updated by",
      "Managed by",
      "Address of Tenant",
      "FLOCK_ID",
      "FLOCK_NAME",
      "Standards applied",
      "Start_flock_count",
      "Start_flock_date",
    ],
    required: ["Tenant_id"],
  },
  "Product_Master.csv": {
    columns: [
      "SKU",
      "Tên hàng hóa",
      "Loại sản phẩm",
      "UOM",
      "UOM_weight_kg",
      "stock_age_min",
      "stock_age_max",
      "Mô tả hàng hóa",
      "Status",
    ],
    required: ["SKU"],
  },
  "Feed_Standard.csv": {
    headerRow: 0,
    columns: [
      "Loại Gà",
      "Ngày Tuổi",
      "TĂ sử dụng (g/c/n)",
      "Thức ăn sử dụng cộng dồn (g/c)",
      "Hệ số sử dụng thức ăn",
      "Hao hụt cộng dồn",
      "Bình quân khối lượng cơ thể (g)",
      "Loại cám",
    ],
    required: ["Loại Gà", "Ngày Tuổi"],
  },
  "Japfa_Inventory_Database - FMS.csv": {
    columns: [
      "Tenant_id",
      "FLOCK_ID",
      "Loại Gà",
      "DATE",
      "Ngày Tuổi",
      "FEED state",
      "POPULATION_act",
      "MORT_act",
      "MORT_est",
      "POPULATION_est",
      "FEED_NAME",
      "FEED_QTY_USE_est",
      "FEED_NAME_order",
      "FEED_begin_qtty",
      "FEED_end_qtty",
      "Stock level percentage",
      "CURRENT DAY",
      "Inventory Thresholds",
      "Day casestudy",
      "Column 20",
    ],
    required: ["Tenant_id", "FLOCK_ID", "DATE"],
  },
  "Policy_Thresholds.csv": {
    columns: [
      "Mã hàng",
      "zero_threshold",
      "critical_threshold",
      "low_threshold",
      "high_threshold",
      "status",
      "note",
    ],
    required: ["Mã hàng"],
  },
  "OMS.csv": {
    columns: [
      "Tenant_id",
      "WMS_Order ID",
      "Create Date",
      "Ngày lấy hàng",
      "Client",
      "Mã hàng",
      "Số lượng",
      "UOM",
      "Nơi đi",
      "Nơi đến",
      "Province",
      "FLOCK_ID",
      "Ngày giao hàng\n(Dự kiến)",
      "Ngày giao hàng\n(Thực tế)",
      "Status",
      "Note",
      "TMS_Order ID",
    ],
    required: ["Tenant_id", "WMS_Order ID", "Mã hàng"],
  },
  "WMS_factory.csv": {
    columns: [
      "Tenant_id",
      "DATE",
      "Order ID",
      "SKU",
      "Loại giao dịch",
      "Tồn kho đầu kỳ",
      "Số lượng In",
      "Số lượng Out",
      "Tồn kho cuối kỳ",
      "Note",
    ],
    required: ["Tenant_id", "SKU", "DATE"],
  },
  "WMS_farm.csv": {
    columns: [
      "Tenant_id",
      "Transaction ID",
      "DATE",
      "Date_input",
      "SKU",
      "Loại giao dịch",
      "FLOCK_ID",
      "Ngày Tuổi",
      "Begin_qtty",
      "In_qtty",
      "Out_qtty",
      "End_qtty",
      "End_qtty_order",
      "Order ID",
    ],
    required: ["Tenant_id", "SKU", "DATE"],
  },
};

const dataDir = path.resolve(process.cwd(), "../../Data-ggSheet");
const apply = process.argv.includes("--apply");
const counts: Record<string, number> = {};
const skipped: Record<string, number> = {};
let activeTransactionID: number | string | null = null;
let activePayload: PayloadClient | null = null;

const transactionRequest = () =>
  activeTransactionID === null
    ? undefined
    : ({ transactionID: activeTransactionID } as never);

const text = (value: unknown) => String(value ?? "").trim();
const key = (value: unknown) => text(value).toUpperCase();
const numberValue = (value: unknown) => {
  const raw = text(value).replace(/%/g, "").replace(/\s/g, "");
  if (!raw) return 0;

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let normalized = raw;

  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? raw.replace(/\./g, "").replace(",", ".")
        : raw.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const commaParts = raw.split(",");
    normalized =
      commaParts.length > 2 ? raw.replace(/,/g, "") : raw.replace(",", ".");
  } else if (lastDot >= 0) {
    const dotParts = raw.split(".");
    const isThousands =
      dotParts.length > 1 &&
      dotParts.slice(1).every((part) => /^\d{3}$/.test(part));
    normalized = isThousands ? raw.replace(/\./g, "") : raw;
  }

  const result = Number(normalized);
  return Number.isFinite(result) ? result : 0;
};

const nullableNumberValue = (value: unknown) => {
  const raw = text(value);
  return raw ? numberValue(raw) : null;
};

const dateValue = (value: unknown) => {
  const raw = text(value);
  if (!raw) return undefined;
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match)
    return new Date(
      `${match[3]}-${match[2]}-${match[1]}T00:00:00.000Z`,
    ).toISOString();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const nullableDateValue = (value: unknown) => dateValue(value) || null;

const readCsv = async (filename: string): Promise<Row[]> => {
  const source = await fs.readFile(path.join(dataDir, filename), "utf8");
  const records = parse(source, {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as string[][];
  const spec = csvSpecs[filename];
  if (!spec) throw new Error(`Chưa khai báo schema cho ${filename}.`);
  const headerRow = spec.headerRow || 0;
  const headers = (records[headerRow] || []).map(text);
  const duplicateHeaders = headers.filter(
    (header, index) => header && headers.indexOf(header) !== index,
  );
  if (duplicateHeaders.length)
    throw new Error(
      `${filename}: header bị trùng: ${[...new Set(duplicateHeaders)].join(", ")}`,
    );
  const missing = (spec.required || []).filter(
    (required) => !headers.includes(required),
  );
  if (missing.length)
    throw new Error(
      `${filename}: thiếu header bắt buộc: ${missing.join(", ")}`,
    );
  const allowed = new Set(spec.columns);
  return records.slice(headerRow + 1).map((values) =>
    headers.reduce<Row>((row, header, index) => {
      if (header && allowed.has(header)) row[header] = text(values[index]);
      return row;
    }, {}),
  );
};

const findOne = async (
  payload: PayloadClient,
  collection: string,
  field: string,
  value: string,
) => {
  const result = await payload.find({
    collection: collection as never,
    where: { [field]: { equals: value } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req: transactionRequest(),
  });
  return result.docs[0] as
    | { id: DocumentID; [field: string]: unknown }
    | undefined;
};

const save = async (
  payload: PayloadClient,
  collection: string,
  field: string,
  value: string,
  data: Record<string, unknown>,
) => {
  const existing = await findOne(payload, collection, field, value);
  if (!apply) return existing || { id: `dry-run-${collection}-${key(value)}` };
  if (existing) {
    await payload.update({
      collection: collection as never,
      id: existing.id,
      data: data as never,
      overrideAccess: true,
      context: { migration: true },
      req: transactionRequest(),
    });
    return existing;
  }
  counts[collection] = (counts[collection] || 0) + 1;
  return payload.create({
    collection: collection as never,
    data: data as never,
    overrideAccess: true,
    context: { migration: true },
    req: transactionRequest(),
  }) as never;
};

const tenantAliases = new Map<string, DocumentID>();
const tenantNameAliases = new Map<string, DocumentID>();
const productAliases = new Map<string, DocumentID>();
const flockAliases = new Map<string, DocumentID>();
const flockTenantAliases = new Map<string, DocumentID>();
const productIndex = new Map<string, { id: DocumentID; sku: string }>();

const normalizeTenant = (value: unknown) => {
  const raw = text(value);
  const match = raw.match(/^([A-Za-z]+)_?0*(\d+)$/);
  return match ? `${match[1]}_${match[2]}`.toUpperCase() : raw.toUpperCase();
};

const resolveTenant = async (payload: PayloadClient, source: string) => {
  const rawSource = text(source);
  const alias = normalizeTenant(rawSource);
  const cached = tenantAliases.get(rawSource.toUpperCase());
  if (cached) return cached;
  const nameKey = key(rawSource);
  const cachedName = tenantNameAliases.get(nameKey);
  if (cachedName) return cachedName;
  const existing =
    (await findOne(payload, "tenants", "tenantId", rawSource)) ||
    (await findOne(payload, "tenants", "tenantId", alias)) ||
    (await findOne(payload, "tenants", "name", rawSource));
  const factoryFallback = /factory|nh[aà]\s*m[aá]y/i.test(source)
    ? (
        await payload.find({
          collection: "tenants",
          where: { type: { equals: "FACTORY" } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
          req: transactionRequest(),
        })
      ).docs[0]
    : undefined;
  if (!existing && !factoryFallback)
    throw new Error(`Không tìm thấy Tenant cho giá trị "${source}".`);
  const resolvedId = existing?.id || factoryFallback?.id;
  if (!resolvedId)
    throw new Error(`Không tìm thấy Tenant cho giá trị "${source}".`);
  tenantAliases.set(rawSource.toUpperCase(), resolvedId);
  tenantAliases.set(alias, resolvedId);
  tenantNameAliases.set(nameKey, resolvedId);
  return resolvedId;
};

const assertRelation = async (
  payload: PayloadClient,
  collection: string,
  id: DocumentID,
  label: string,
) => {
  if (!id || (typeof id === "string" && id.startsWith("dry-run-")))
    throw new Error(
      `Relationship không hợp lệ cho ${label}: ${id || "<empty>"}`,
    );
  const result = await payload.findByID({
    collection: collection as never,
    id,
    depth: 0,
    overrideAccess: true,
    req: transactionRequest(),
  });
  if (!result) throw new Error(`Không tìm thấy ${label} với ID ${id}`);
  return id;
};

const resolveProduct = async (payload: PayloadClient, source: string) => {
  const sourceKey = key(source);
  const cached = productAliases.get(sourceKey);
  if (cached) return cached;
  const products = apply
    ? (
        await payload.find({
          collection: "products",
          limit: 1000,
          depth: 0,
          overrideAccess: true,
          req: transactionRequest(),
        })
      ).docs
    : Array.from(productIndex.values());
  const product = products.find((item) => key(item.sku) === sourceKey);
  if (product) {
    productAliases.set(sourceKey, product.id);
    return product.id;
  }

  if (apply) {
    const created = await save(payload, "products", "sku", text(source), {
      sku: text(source),
      name: text(source),
      productType: "Chicken_feed",
      uom: "Bag",
      uomWeightKg: 40,
      status: "ACTIVE",
    });
    productAliases.set(sourceKey, created.id);
    return created.id;
  }

  throw new Error(`Không tìm thấy Product/SKU cho giá trị "${source}".`);
};

const resolveFlock = async (payload: PayloadClient, source: string) => {
  const sourceKey = key(source);
  const cached = flockAliases.get(sourceKey);
  if (cached) return cached;
  const existing = await findOne(payload, "flocks", "flockId", source);
  if (!existing)
    throw new Error(`Không tìm thấy Flock cho giá trị "${source}".`);
  flockAliases.set(sourceKey, existing.id);
  return existing.id;
};

const statusValue = (value: unknown) => {
  const normalized = key(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("HOAN TAT") || normalized === "COMPLETED")
    return "COMPLETED";
  if (normalized.includes("CHO GIAO") || normalized === "IN_TRANSIT")
    return "IN_TRANSIT";
  if (normalized.includes("DA LAY") || normalized === "PICKED_UP")
    return "PICKED_UP";
  return "PLANNED";
};

const systemValue = (value: unknown) => {
  const normalized = key(value);
  return ["WMS", "FMS", "OMS", "TMS"].includes(normalized) ? normalized : "WMS";
};

async function migrate() {
  const payload = await getPayload({ config });
  activePayload = payload;
  if (apply) {
    activeTransactionID = await payload.db.beginTransaction();
    if (activeTransactionID === null)
      throw new Error("PostgreSQL transaction không khả dụng.");
  }
  const configRows = await readCsv("Config.csv");
  const productRows = await readCsv("Product_Master.csv");
  const feedRows = await readCsv("Feed_Standard.csv");
  const fmsRows = await readCsv("Japfa_Inventory_Database - FMS.csv");
  const policyRows = await readCsv("Policy_Thresholds.csv");
  const orderRows = await readCsv("OMS.csv");
  const factoryRows = await readCsv("WMS_factory.csv");
  const farmRows = await readCsv("WMS_farm.csv");

  for (const row of configRows) {
    const tenantId = text(row.Tenant_id);
    if (!tenantId || key(tenantId) === "BLANK_ROW") continue;
    const tenant = await save(payload, "tenants", "tenantId", tenantId, {
      tenantId,
      name: text(row.Tenant) || tenantId,
      system: systemValue(row.SYSTEM),
      updatedBy: text(row["Updated by"]),
      managedBy: text(row["Managed by"]),
      addressOfTenant: text(row["Address of Tenant"]),
      flockName: text(row.FLOCK_NAME),
      standardsApplied: text(row["Standards applied"]),
      startFlockCount: nullableNumberValue(row.Start_flock_count),
      startFlockDate: nullableDateValue(row.Start_flock_date),
      type:
        /factory|nha may/i.test(`${row.Tenant} ${row["Managed by"]}`) ||
        key(tenantId) === "WMS_01"
          ? "FACTORY"
          : "FARM",
    });
    tenantAliases.set(normalizeTenant(tenantId), tenant.id);
    tenantNameAliases.set(key(row.Tenant), tenant.id);
    tenantNameAliases.set(key(row["Managed by"]), tenant.id);
  }

  for (const row of productRows) {
    if (!text(row.SKU)) continue;
    const sku = text(row.SKU);
    const product = await save(payload, "products", "sku", sku, {
      sku,
      name: text(row["Tên hàng hóa"]) || sku,
      productType: text(row["Loại sản phẩm"]) || "Chicken_feed",
      uom: text(row.UOM) || "Bag",
      uomWeightKg: numberValue(row.UOM_weight_kg),
      stockAgeMin: numberValue(row.stock_age_min),
      stockAgeMax: numberValue(row.stock_age_max),
      status: key(row.Status) === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      description: text(row["Mô tả hàng hóa"]),
    });
    productIndex.set(key(sku), { id: product.id, sku });
  }

  // Config is the authoritative source for flocks that may not yet have FMS logs.
  for (const row of configRows) {
    const flockId = text(row.FLOCK_ID);
    if (!flockId || key(flockId) === "BLANK_ROW") continue;
    const managedBy = text(row["Managed by"]);
    const farmMatch = managedBy.match(/Japfa\s+Farm\s+(\d+)/i);
    const ownerTenant = farmMatch
      ? await resolveTenant(payload, `WMS_${farmMatch[1]}`)
      : await resolveTenant(payload, text(row.Tenant_id));
    await assertRelation(
      payload,
      "tenants",
      ownerTenant,
      `Tenant của Flock ${flockId}`,
    );
    const flock = await save(payload, "flocks", "flockId", flockId, {
      flockId,
      tenant: ownerTenant,
      chickenType: text(row["Standards applied"]) || "Unknown",
      initialBirdCount: numberValue(row.Start_flock_count),
      startDate: dateValue(row.Start_flock_date) || new Date().toISOString(),
      flockName: text(row.FLOCK_NAME),
      sourceFlockGroup: text(row.Tenant),
      standardsApplied: text(row["Standards applied"]),
    });
    flockAliases.set(key(flockId), flock.id);
    flockTenantAliases.set(key(flockId), ownerTenant);
  }

  for (const row of fmsRows) {
    const flockId = text(row.FLOCK_ID);
    if (!flockId || key(flockId) === "BLANK_ROW") continue;
    if (flockAliases.has(key(flockId))) continue;
    const tenantSource = text(row.Tenant_id);
    const tenantId =
      tenantAliases.get(normalizeTenant(tenantSource)) ||
      (await resolveTenant(payload, tenantSource));
    const flock = await save(payload, "flocks", "flockId", flockId, {
      flockId,
      tenant: tenantId,
      chickenType: text(row["Loại Gà"]) || "Unknown",
      initialBirdCount: numberValue(row.POPULATION_act || row.POPULATION_est),
      startDate: dateValue(row.DATE) || new Date().toISOString(),
      sourceFlockGroup: text(row.Tenant_id),
    });
    flockAliases.set(key(flockId), flock.id);
    flockTenantAliases.set(key(flockId), tenantId);
  }

  for (const [index, row] of fmsRows.entries()) {
    const flockId = text(row.FLOCK_ID);
    const date = dateValue(row.DATE);
    if (!flockId || key(flockId) === "BLANK_ROW" || !date) continue;
    const flock = await resolveFlock(payload, flockId);
    const tenant =
      flockTenantAliases.get(key(flockId)) ||
      (await resolveTenant(payload, text(row.Tenant_id)));
    const feedSource = text(row.FEED_NAME);
    const feedProduct = feedSource
      ? await resolveProduct(payload, feedSource)
      : undefined;
    await save(payload, "fms-daily-logs", "migrationKey", `fms:${index + 1}`, {
      migrationKey: `fms:${index + 1}`,
      tenant,
      sourceTenantId: text(row.Tenant_id),
      flock,
      date,
      ageInDays: numberValue(row["Ngày Tuổi"]),
      birdCount: nullableNumberValue(row.POPULATION_act),
      feedProduct,
      feedQtyEst: nullableNumberValue(row.FEED_QTY_USE_est),
      feedQtyAct: null,
      endQty: nullableNumberValue(row.FEED_end_qtty),
      badgeStatus:
        key(row["Inventory Thresholds"]) === "ZERO"
          ? "ZERO"
          : key(row["Inventory Thresholds"]) === "CRITICAL"
            ? "CRITICAL"
            : key(row["Inventory Thresholds"]) === "LOW"
              ? "LOW"
              : "NORMAL",
      feedState: text(row["FEED state"]),
      mortAct: nullableNumberValue(row.MORT_act),
      mortEst: nullableNumberValue(row.MORT_est),
      populationEst: nullableNumberValue(row.POPULATION_est),
      feedNameOrder: text(row.FEED_NAME_order),
      feedBeginQty: nullableNumberValue(row.FEED_begin_qtty),
      stockLevelPercentage: nullableNumberValue(row["Stock level percentage"]),
      currentDay: nullableNumberValue(row["CURRENT DAY"]),
      dayCaseStudy: text(row["Day casestudy"]),
      sourceColumn20: text(row["Column 20"]),
    });
  }

  for (const row of feedRows) {
    const chickenType = text(row["Loại Gà"]);
    const age = text(row["Ngày Tuổi"]);
    if (!chickenType || !age || key(chickenType) === "LOAI GA") continue;
    await save(
      payload,
      "feed-standards",
      "migrationKey",
      `feed:${chickenType}:${age}`,
      {
        migrationKey: `feed:${chickenType}:${age}`,
        chickenType,
        ageInDays: numberValue(age),
        feedQtyPerBirdPerDay: numberValue(row["TĂ sử dụng (g/c/n)"]),
        cumFeedQty: numberValue(row["Thức ăn sử dụng cộng dồn (g/c)"]),
        fcr: numberValue(row["FCR "] || row["Hệ số sử dụng thức ăn"]),
        cumDepPercent: numberValue(
          row["Cum. Dep (%)"] || row["Hao hụt cộng dồn"],
        ),
        bwGr: numberValue(
          row["BW (gr)"] || row["Bình quân khối lượng cơ thể (g)"],
        ),
        feedName: text(row["Loại cám"]),
      },
    );
  }

  for (const row of policyRows) {
    const name = text(row["Mã hàng"]);
    if (!name) continue;
    await save(payload, "policy-thresholds", "sku", name, {
      sku: name,
      minStockDays: 0,
      lowStockThreshold: nullableNumberValue(row.low_threshold),
      criticalStockThreshold: nullableNumberValue(row.critical_threshold),
      zeroThreshold: nullableNumberValue(row.zero_threshold),
      highThreshold: nullableNumberValue(row.high_threshold),
      status: text(row.status),
      note: text(row.note),
    });
  }

  for (const [index, row] of orderRows.entries()) {
    const orderId = text(row["WMS_Order ID"]);
    if (!orderId && !text(row["Mã hàng"])) continue;
    const tenant = await resolveTenant(payload, text(row.Tenant_id));
    const originSource = text(row["Nơi đi"]);
    const destinationDisplay = text(row["Nơi đến"]);
    const destinationSource = destinationDisplay.replace(
      /\s*-\s*Flock\s*\d+$/i,
      "",
    );
    const origin = /nh[aà]\s*m[aá]y/i.test(originSource)
      ? await resolveTenant(payload, "WMS_01")
      : await resolveTenant(payload, originSource);
    const destination = /nh[aà]\s*m[aá]y/i.test(destinationSource)
      ? await resolveTenant(payload, "WMS_01")
      : await resolveTenant(payload, destinationSource);
    const product = await resolveProduct(payload, text(row["Mã hàng"]));
    const flock = text(row.FLOCK_ID)
      ? await resolveFlock(payload, text(row.FLOCK_ID))
      : undefined;
    await save(
      payload,
      "orders",
      orderId ? "orderId" : "migrationKey",
      orderId || `oms:${index + 1}`,
      {
        orderId: orderId || undefined,
        tenant,
        client: text(row.Client),
        origin,
        destination,
        originDisplay: originSource,
        destinationDisplay,
        product,
        quantity: numberValue(row["Số lượng"]),
        uom: text(row.UOM) || "Bao",
        status: statusValue(row.Status),
        pickupDate: dateValue(row["Ngày lấy hàng"]),
        expectedDeliveryDate:
          dateValue(row["Ngày giao hàng\n(Dự kiến)"]) ||
          dateValue(row["Ngày giao hàng (Dự kiến)"]),
        actualDeliveryDate: dateValue(row["Ngày giao hàng\n(Thực tế)"]),
        flock,
        note: text(row.Note),
        migrationKey: `oms:${index + 1}`,
        createDate: nullableDateValue(row["Create Date"]),
        location: text(row.Province),
        tmsOrderId: text(row["TMS_Order ID"]),
      },
    );
  }

  const transactionRows = [
    ...factoryRows.map((row, index) => ({ row, scope: "FACTORY", index })),
    ...farmRows.map((row, index) => ({ row, scope: "FARM", index })),
  ];
  for (const item of transactionRows) {
    const row = item.row;
    const sourceSku = text(row.SKU);
    const sourceTenant = text(row.Tenant_id);
    if (!sourceSku || !sourceTenant || key(sourceTenant) === "BLANK_ROW")
      continue;
    const tenant = await resolveTenant(payload, sourceTenant);
    const product = await resolveProduct(payload, sourceSku);
    const flock =
      item.scope === "FARM" && text(row.FLOCK_ID)
        ? await resolveFlock(payload, text(row.FLOCK_ID))
        : undefined;
    const rawType = key(row["Loại giao dịch"]);
    const txnType =
      rawType === "CONSUME"
        ? "CONSUME"
        : rawType === "LOSS"
          ? "LOSS"
          : rawType === "OUTBOUND"
            ? "OUTBOUND"
            : rawType === "ADJUSTMENT"
              ? "ADJUSTMENT"
              : "INBOUND";
    const quantity =
      item.scope === "FACTORY"
        ? numberValue(
            txnType === "OUTBOUND" || txnType === "LOSS"
              ? row["Số lượng Out"]
              : row["Số lượng In"],
          )
        : numberValue(
            txnType === "OUTBOUND" || txnType === "CONSUME"
              ? row.Out_qtty
              : row.In_qtty,
          );
    if (quantity <= 0) {
      skipped["wms-transactions"] = (skipped["wms-transactions"] || 0) + 1;
      continue;
    }
    await save(
      payload,
      "wms-transactions",
      "migrationKey",
      `wms:${item.scope}:${item.index + 1}`,
      {
        migrationKey: `wms:${item.scope}:${item.index + 1}`,
        scope: item.scope,
        tenant,
        flock,
        product,
        txnType,
        quantity,
        transactionId: text(row["Transaction ID"]),
        dateInput: nullableDateValue(row.Date_input),
        ageInDays: nullableNumberValue(row["Ngày Tuổi"]),
        beginQuantity: nullableNumberValue(
          item.scope === "FACTORY" ? row["Tồn kho đầu kỳ"] : row.Begin_qtty,
        ),
        inQuantity: nullableNumberValue(
          item.scope === "FACTORY" ? row["Số lượng In"] : row.In_qtty,
        ),
        outQuantity: nullableNumberValue(
          item.scope === "FACTORY" ? row["Số lượng Out"] : row.Out_qtty,
        ),
        endQuantity: nullableNumberValue(
          item.scope === "FACTORY" ? row["Tồn kho cuối kỳ"] : row.End_qtty,
        ),
        endOrderQuantity: nullableNumberValue(row.End_qtty_order),
        order: text(row["Order ID"])
          ? (await findOne(payload, "orders", "orderId", text(row["Order ID"])))
              ?.id
          : undefined,
        date: dateValue(row.DATE) || new Date().toISOString(),
        note:
          text(row.Note) ||
          `Imported from ${item.scope} CSV row ${item.index + 1}`,
      },
    );
  }

  if (activeTransactionID !== null) {
    await payload.db.commitTransaction(activeTransactionID);
    activeTransactionID = null;
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        dataDir,
        created: counts,
        skipped,
      },
      null,
      2,
    ),
  );
  await payload.db.destroy?.();
}

migrate().catch((error) => {
  const rollback = async () => {
    if (activeTransactionID !== null) {
      await activePayload?.db.rollbackTransaction(activeTransactionID);
      activeTransactionID = null;
      await activePayload?.db.destroy?.();
    }
    console.error(error);
    process.exitCode = 1;
  };
  void rollback();
});
