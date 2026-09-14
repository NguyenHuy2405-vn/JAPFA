/**
 * Client-side cascading <select> filter logic for the Setup "Tài khoản" tab.
 * Ported from the legacy Apps Script `loadSetup()` (JAPFA/ui/scripts/AppMain.html)
 * so the web UI filters via dropdowns instead of free-text input, and mirrors
 * the 4 account "blocks": TRANSPORT / FACTORY / FARM / FLOCK.
 */

export type AccountBlock = "transport" | "factory" | "farm" | "flock";

export interface AccountRow {
  _kind: "tenant" | "flock";
  _id: number | string;
  system: string;
  tenant: string;
  tenant_id: string;
  type?: string;
  managed_by: string;
  address_of_tenant: string;
  flock_id: string;
  flock_name: string;
  standards_applied?: string;
  start_flock_count?: number | string;
  start_flock_date?: string;
  updated_by?: string;
  _farmTenantId?: string;
  _sourceGroup?: string;
}

export interface AccountFilterSelection {
  block: AccountBlock;
  system: string;
  tenant: string;
  tenantId: string;
  address: string;
  flockId: string;
  flockName: string;
}

export interface AccountFilterResult {
  effective: AccountFilterSelection;
  options: {
    block: Array<{ value: AccountBlock; label: string }>;
    system: string[];
    tenant: string[];
    tenantId: string[];
    address: string[];
    flockId: string[];
    flockName: string[];
  };
  visibility: {
    tenant: boolean;
    tenantId: boolean;
    flockId: boolean;
    flockName: boolean;
  };
  rows: AccountRow[];
}

export const BLOCK_OPTIONS: Array<{ value: AccountBlock; label: string }> = [
  { value: "transport", label: "TRANSPORT" },
  { value: "factory", label: "FACTORY" },
  { value: "farm", label: "FARM" },
  { value: "flock", label: "FLOCK" },
];

export const BLOCK_SYSTEM_OPTIONS: Record<AccountBlock, string[]> = {
  transport: ["TMS"],
  factory: ["OMS", "WMS"],
  farm: ["WMS"],
  flock: ["FMS"],
};

export const ACCOUNT_TABLE_COLUMNS: Record<
  AccountBlock,
  Array<{ key: string; labelKey: string }>
> = {
  transport: [
    { key: "system", labelKey: "hSystem" },
    { key: "tenant", labelKey: "hTenant" },
    { key: "tenant_id", labelKey: "hTenantId" },
    { key: "address_of_tenant", labelKey: "hAddress" },
  ],
  factory: [
    { key: "system", labelKey: "hSystem" },
    { key: "tenant", labelKey: "hTenant" },
    { key: "tenant_id", labelKey: "hTenantId" },
    { key: "address_of_tenant", labelKey: "hAddress" },
  ],
  farm: [
    { key: "system", labelKey: "hSystem" },
    { key: "tenant", labelKey: "hTenant" },
    { key: "address_of_tenant", labelKey: "hAddress" },
    { key: "flock_id", labelKey: "hFlock" },
    { key: "flock_name", labelKey: "hFlockName" },
  ],
  flock: [
    { key: "system", labelKey: "hSystem" },
    { key: "tenant", labelKey: "hTenant" },
    { key: "tenant_id", labelKey: "hTenantId" },
    { key: "address_of_tenant", labelKey: "hAddress" },
    { key: "start_flock_count", labelKey: "hStartFlockCount" },
    { key: "start_flock_date", labelKey: "hStartFlockDate" },
  ],
};

const norm = (value: unknown) => String(value ?? "").trim();
const upper = (value: unknown) => norm(value).toUpperCase();

export const isFactoryRow = (row: AccountRow) => {
  if (row.type) return upper(row.type) === "FACTORY";
  const text = `${row.tenant} ${row.managed_by}`.toLowerCase();
  return /factory|nhà máy|nha may/.test(text);
};

const uniqueSorted = (values: Array<string | undefined>) =>
  Array.from(new Set(values.map(norm).filter(Boolean))).sort();

const pick = (options: string[], value: string) =>
  options.includes(value) ? value : "";

export function computeAccountFilters(
  allRows: AccountRow[],
  selection: AccountFilterSelection,
): AccountFilterResult {
  const tenantRows = allRows.filter((r) => r._kind === "tenant");
  const flockRows = allRows.filter((r) => r._kind === "flock");

  const block = selection.block;
  const systemOptions = BLOCK_SYSTEM_OPTIONS[block];
  const effectiveSystem = systemOptions.includes(upper(selection.system))
    ? upper(selection.system)
    : systemOptions[0];

  if (block === "flock") {
    let rows = flockRows;

    const tenantOptions = uniqueSorted(rows.map((r) => r.tenant));
    const effectiveTenant = pick(tenantOptions, selection.tenant);
    if (effectiveTenant)
      rows = rows.filter((r) => r.tenant === effectiveTenant);

    const tenantIdOptions = uniqueSorted(rows.map((r) => r.tenant_id));
    const effectiveTenantId = pick(tenantIdOptions, selection.tenantId);
    if (effectiveTenantId)
      rows = rows.filter((r) => r.tenant_id === effectiveTenantId);

    const addressOptions = uniqueSorted(rows.map((r) => r.address_of_tenant));
    const effectiveAddress = pick(addressOptions, selection.address);
    if (effectiveAddress)
      rows = rows.filter((r) => r.address_of_tenant === effectiveAddress);

    return {
      effective: {
        block,
        system: effectiveSystem,
        tenant: effectiveTenant,
        tenantId: effectiveTenantId,
        address: effectiveAddress,
        flockId: "",
        flockName: "",
      },
      options: {
        block: BLOCK_OPTIONS,
        system: systemOptions,
        tenant: tenantOptions,
        tenantId: tenantIdOptions,
        address: addressOptions,
        flockId: [],
        flockName: [],
      },
      visibility: {
        tenant: true,
        tenantId: true,
        flockId: false,
        flockName: false,
      },
      rows,
    };
  }

  let rows = tenantRows.filter((r) => {
    if (upper(r.system) !== effectiveSystem) return false;
    if (block === "transport") return true;
    if (block === "factory") return isFactoryRow(r);
    return !isFactoryRow(r); // farm
  });

  const tenantOptions = uniqueSorted(rows.map((r) => r.tenant));
  const effectiveTenant =
    block === "factory" ? "" : pick(tenantOptions, selection.tenant);
  if (effectiveTenant) rows = rows.filter((r) => r.tenant === effectiveTenant);

  const tenantIdOptions = uniqueSorted(rows.map((r) => r.tenant_id));
  const effectiveTenantId =
    block === "farm" ? "" : pick(tenantIdOptions, selection.tenantId);
  if (effectiveTenantId)
    rows = rows.filter((r) => r.tenant_id === effectiveTenantId);

  const addressOptions = uniqueSorted(rows.map((r) => r.address_of_tenant));
  const effectiveAddress = pick(addressOptions, selection.address);
  if (effectiveAddress)
    rows = rows.filter((r) => r.address_of_tenant === effectiveAddress);

  let flockIdOptions: string[] = [];
  let flockNameOptions: string[] = [];
  let effectiveFlockId = "";
  let effectiveFlockName = "";

  if (block === "farm") {
    const expanded: AccountRow[] = [];
    rows.forEach((farmRow) => {
      const related = flockRows.filter(
        (f) => f._farmTenantId === farmRow.tenant_id,
      );
      if (related.length === 0) {
        expanded.push(farmRow);
        return;
      }
      related.forEach((f) =>
        expanded.push({
          ...farmRow,
          flock_id: f.flock_id,
          flock_name: f.flock_name,
        }),
      );
    });
    rows = expanded;

    flockIdOptions = uniqueSorted(rows.map((r) => r.flock_id));
    effectiveFlockId = pick(flockIdOptions, selection.flockId);
    if (effectiveFlockId)
      rows = rows.filter((r) => r.flock_id === effectiveFlockId);

    flockNameOptions = uniqueSorted(rows.map((r) => r.flock_name));
    effectiveFlockName = pick(flockNameOptions, selection.flockName);
    if (effectiveFlockName)
      rows = rows.filter((r) => r.flock_name === effectiveFlockName);
  }

  return {
    effective: {
      block,
      system: effectiveSystem,
      tenant: effectiveTenant,
      tenantId: effectiveTenantId,
      address: effectiveAddress,
      flockId: effectiveFlockId,
      flockName: effectiveFlockName,
    },
    options: {
      block: BLOCK_OPTIONS,
      system: systemOptions,
      tenant: tenantOptions,
      tenantId: tenantIdOptions,
      address: addressOptions,
      flockId: flockIdOptions,
      flockName: flockNameOptions,
    },
    visibility: {
      tenant: block !== "factory",
      tenantId: block !== "farm",
      flockId: block === "farm",
      flockName: block === "farm",
    },
    rows,
  };
}
