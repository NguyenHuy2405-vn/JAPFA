/**
 * =============================================================================
 * FILE: ConfigService.gs
 * PURPOSE: Đọc dữ liệu `Config` (danh mục Tenant/Flock). Ghi dữ liệu thuộc
 *          về SetupService.gs (upsertConfig) — file này CHỈ ĐỌC, dùng làm
 *          nguồn tra cứu cho các Service khác (OMSService, WMSService,
 *          FMSService, DashboardService).
 * AUTHOR: (placeholder)
 * DEPENDENCIES: Utils.gs (getSheetData_, tenantIdEquals_), ApiResponse.gs
 * REFERENCE: Japfa_Technical_Reference.md §4.1
 * =============================================================================
 */

/**
 * Lấy toàn bộ danh sách Tenant (Config), có thể lọc theo SYSTEM.
 * Dùng cho dropdown "Nơi đi/Nơi đến" (OMS), "Tenant" (WMS/Setup).
 *
 * @param {{SYSTEM:string}} [filters] - VD { SYSTEM: 'WMS' }.
 * @returns {{success:boolean, data:Object[]}}
 * @example
 * getConfigList({ SYSTEM: 'WMS' });
 */
function getConfigList(filters) {
  try {
    const rows = getSheetData_('CONFIG');
    return success_(filterRows_(rows, filters));
  } catch (e) {
    Logger_.logError('ConfigService.getConfigList', e);
    return error_(e, 'GET_CONFIG_LIST_FAILED');
  }
}

/**
 * Lấy danh sách Flock (chỉ những dòng Config có FLOCK_ID không rỗng),
 * dùng cho Dashboard FMS filter và dropdown chọn Flock ở WMS_farm form.
 *
 * @param {string} [tenantId] - Lọc theo Tenant_id cụ thể (đã chuẩn hoá TD-04).
 * @returns {{success:boolean, data:Object[]}}
 * @example
 * getFlockList('WMS_1');
 */
function getFlockList(tenantId) {
  try {
    let rows = getSheetData_('CONFIG').filter(function (r) {
      return r['FLOCK_ID'] !== '' && r['FLOCK_ID'] !== undefined && r['FLOCK_ID'] !== null;
    });
    if (tenantId) {
      rows = rows.filter(function (r) { return tenantIdEquals_(r['Tenant_id'], tenantId); });
    }
    return success_(rows);
  } catch (e) {
    Logger_.logError('ConfigService.getFlockList', e);
    return error_(e, 'GET_FLOCK_LIST_FAILED');
  }
}

/**
 * Tìm 1 dòng Config theo Tenant_id (đã chuẩn hoá TD-04) — dùng nội bộ
 * bởi Service khác (không expose trực tiếp qua google.script.run).
 *
 * @param {string} tenantId
 * @returns {Object|null}
 * @example
 * const cfg = findConfigByTenantId_('WMS_01'); // khớp cả 'WMS_1'
 */
function findConfigByTenantId_(tenantId) {
  const rows = getSheetData_('CONFIG');
  return rows.find(function (r) { return tenantIdEquals_(r['Tenant_id'], tenantId); }) || null;
}

/**
 * Tìm Tenant_id thật từ tên hiển thị (Tenant) — dùng khi FE chỉ gửi lên
 * tên hiển thị (VD "Japfa Farm 1") thay vì Tenant_id.
 *
 * @param {string} tenantDisplayName
 * @returns {string|null} Tenant_id nếu tìm thấy, null nếu không.
 * @example
 * findTenantIdByName_('Japfa Farm 1'); // 'WMS_1'
 */
function findTenantIdByName_(tenantDisplayName) {
  const rows = getSheetData_('CONFIG');
  const found = rows.find(function (r) {
    return String(r['Tenant']).trim().toLowerCase() === String(tenantDisplayName).trim().toLowerCase();
  });
  return found ? found['Tenant_id'] : null;
}

/**
 * Lấy FLOCK_ID hiện tại được gán cho 1 Tenant (farm) — dùng bởi
 * InventoryService/FMSService khi cần map Tenant→Flock.
 *
 * @param {string} tenantId
 * @returns {string|null}
 * @example
 * getFlockIdByTenant_('WMS_1'); // 'CKMN0545/0004'
 */
function getFlockIdByTenant_(tenantId) {
  const cfg = findConfigByTenantId_(tenantId);
  return (cfg && cfg['FLOCK_ID']) ? cfg['FLOCK_ID'] : null;
}