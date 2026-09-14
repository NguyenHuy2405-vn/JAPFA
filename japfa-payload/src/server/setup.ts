import type { Payload } from "payload";
import type {
  FeedStandard,
  Flock,
  PolicyThreshold,
  Product,
  Tenant,
  User,
} from "../../payload-types";

type SetupSection = "account" | "product" | "feed" | "policy" | "standard";

type SetupFilters = {
  block?: string;
  search?: string;
  system?: string;
  tenant?: string;
  tenantId?: string;
  address?: string;
  flockId?: string;
  flockName?: string;
  chicken?: string;
  feedType?: string;
  age?: string;
};

const text = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export async function findSetupRows(
  payload: Payload,
  section: SetupSection,
  filters: SetupFilters = {},
  user?: User,
) {
  if (section === "account") {
    // NOTE: filtering (block/system/tenant/tenantId/address/flockId/flockName)
    // is now done client-side with cascading <select> dropdowns (see
    // src/utils/setupAccountFilters.ts) so the UI never forces free-text
    // input — this endpoint just returns the full unfiltered dataset.
    const [tenantResult, flockResult] = await Promise.all([
      payload.find({
        collection: "tenants",
        limit: 1000,
        pagination: false,
        sort: "tenantId",
        user,
        overrideAccess: false,
      }),
      payload.find({
        collection: "flocks",
        limit: 1000,
        pagination: false,
        depth: 1,
        sort: "id",
        user,
        overrideAccess: false,
      }),
    ]);

    const tenantRows = tenantResult.docs.map((row: Tenant) => ({
      _kind: "tenant" as const,
      _id: row.id,
      system: row.system || "",
      tenant: row.name,
      tenant_id: row.tenantId,
      type: row.type || "",
      managed_by: row.managedBy || "",
      address_of_tenant: row.addressOfTenant || "",
      flock_id: row.flockId || "",
      flock_name: row.flockName || "",
      standards_applied: row.standardsApplied || "",
      start_flock_count: row.startFlockCount ?? "",
      start_flock_date: row.startFlockDate || "",
      updated_by: row.updatedBy || "",
    }));

    const flockGroupSeq: Record<string, number> = {};
    const flockRows = flockResult.docs.map((row: Flock) => {
      const farm =
        typeof row.tenant === "object" && row.tenant !== null
          ? (row.tenant as Tenant)
          : null;
      // Legacy Config sheet groups flocks under a synthetic "FLOCK_n" tenant
      // label with its own per-flock id (e.g. "FLOCK_11"/"FLOCK_12"); the new
      // schema only kept the group label, so rebuild the per-flock id by
      // numbering flocks within the same group in creation order.
      const group = row.sourceFlockGroup || farm?.name || "";
      const seq = group
        ? (flockGroupSeq[group] = (flockGroupSeq[group] || 0) + 1)
        : 0;
      const tenantId = group ? `${group}${seq}` : row.flockId;
      return {
        _kind: "flock" as const,
        _id: row.id,
        system: "FMS",
        tenant: group,
        tenant_id: tenantId,
        type: "",
        managed_by: farm?.managedBy || "",
        address_of_tenant: farm?.addressOfTenant || "",
        flock_id: row.flockId,
        flock_name: row.flockName || "",
        standards_applied: row.standardsApplied || row.chickenType || "",
        start_flock_count: row.initialBirdCount ?? "",
        start_flock_date: row.startDate || "",
        updated_by: "",
        _farmTenantId: farm?.tenantId || "",
        _sourceGroup: row.sourceFlockGroup || "",
      };
    });

    return [...tenantRows, ...flockRows];
  }

  if (section === "product") {
    const result = await payload.find({
      collection: "products",
      limit: 1000,
      pagination: false,
      sort: "sku",
      user,
      overrideAccess: false,
    });
    const search = text(filters.search);
    return result.docs
      .filter(
        (row: Product) =>
          !search ||
          [row.sku, row.name, row.productType, row.status].some((value) =>
            text(value).includes(search),
          ),
      )
      .map((row: Product) => ({
        sku: row.sku,
        ten_hang_hoa: row.name,
        loai_san_pham: row.productType,
        uom: row.uom,
        uom_weight_kg: row.uomWeightKg,
        status: row.status,
      }));
  }

  if (section === "feed" || section === "standard") {
    const result = await payload.find({
      collection: "feed-standards",
      limit: 1000,
      pagination: false,
      sort: "chickenType,ageInDays",
      user,
      overrideAccess: false,
    });
    const chicken = text(filters.chicken);
    const feedType = text(filters.feedType);
    const age = Number(filters.age || 0);
    return result.docs
      .filter(
        (row: FeedStandard) =>
          !chicken || text(row.chickenType).includes(chicken),
      )
      .filter(
        (row: FeedStandard) =>
          !feedType || text(row.feedName).includes(feedType),
      )
      .filter((row: FeedStandard) => !age || Number(row.ageInDays) === age)
      .map((row: FeedStandard) => ({
        id: row.id,
        loai_ga: row.chickenType,
        ngay_tuoi: row.ageInDays,
        ta_su_dung_g_c_n: row.feedQtyPerBirdPerDay,
        thuc_an_su_dung_cong_don_g_c: row.cumFeedQty,
        he_so_su_dung_thuc_an: row.fcr,
        hao_hut_cong_don: row.cumDepPercent,
        binh_quan_khoi_luong_co_the_g: row.bwGr,
        loai_cam: row.feedName,
      }))
      .sort((a, b) => {
        const chickenCmp = String(a.loai_ga || "").localeCompare(
          String(b.loai_ga || ""),
        );
        if (chickenCmp !== 0) return chickenCmp;
        return Number(a.ngay_tuoi || 0) - Number(b.ngay_tuoi || 0);
      });
  }

  const result = await payload.find({
    collection: "policy-thresholds",
    limit: 1000,
    pagination: false,
    sort: "sku",
    user,
    overrideAccess: false,
  });
  const search = text(filters.search);
  return result.docs
    .filter(
      (row: PolicyThreshold) =>
        !search ||
        [row.sku, row.status, row.note].some((value) =>
          text(value).includes(search),
        ),
    )
    .map((row: PolicyThreshold) => ({
      ma_hang: row.sku,
      zero_threshold: row.zeroThreshold,
      critical_threshold: row.criticalStockThreshold,
      low_threshold: row.lowStockThreshold,
      high_threshold: row.highThreshold,
      status: row.status,
      note: row.note,
    }));
}
