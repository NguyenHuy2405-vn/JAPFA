/**
 * Chuẩn hoá Tenant_id để so khớp an toàn giữa các hệ thống (VD: "WMS_01" -> "WMS_1")
 */
export function normalizeTenantId(tenantId: string | null | undefined): string {
  if (!tenantId) return "";
  const str = String(tenantId).trim();
  const match = str.match(/^([A-Za-z]+)_?0*(\d+)$/);
  if (match) {
    return `${match[1]}_${match[2]}`;
  }
  return str;
}
