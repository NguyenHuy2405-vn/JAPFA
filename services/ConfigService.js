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

/**
 * Tìm 1 dòng Config theo FLOCK_ID (khớp chính xác sau khi trim).
 * Dùng cho WMS Farm Management và Farm Order wizard.
 *
 * @param {string} flockId
 * @returns {Object|null}
 */
function findConfigByFlockId_(flockId) {
  const target = String(flockId || '').trim();
  if (!target) return null;
  const rows = getSheetData_('CONFIG');
  return rows.find(function (r) {
    return String(r['FLOCK_ID'] || '').trim() === target;
  }) || null;
}

/**
 * API filter Farm/Flock dùng cache backend.
 *
 * Flow:
 * 1) Lọc Config theo SYSTEM (mặc định 'FMS').
 * 2) Parse `Managed by`: "Japfa Farm 1 - Flock 1" -> "Japfa Farm 1".
 * 3) Map FLOCK_ID theo farm parsed.
 * 4) Cache kết quả để FE dùng ổn định.
 *
 * @param {string} [systemName='FMS']
 * @returns {{success:boolean, data:{farms:string[], flocksByFarm:Object, rows:Object[], sourceSystem:string, cacheHit:boolean}}}
 */
function getFarmFilterData(systemName) {
  try {
    const requestedSystem = String(systemName || 'FMS').trim().toUpperCase();
    const cache = CacheService.getScriptCache();
    const cacheKey = _getFarmFilterCacheKey_(requestedSystem);
    const cached = cache.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      parsed.cacheHit = true;
      return success_(parsed);
    }

    let rows = getSheetData_('CONFIG').filter(function (r) {
      return String(r['SYSTEM'] || '').trim().toUpperCase() === requestedSystem;
    });

    let sourceSystem = requestedSystem;
    // Backward compatibility: nếu chưa có SYSTEM='FMS' thì fallback SYSTEM='WMS'.
    if (rows.length === 0 && requestedSystem === 'FMS') {
      rows = getSheetData_('CONFIG').filter(function (r) {
        return String(r['SYSTEM'] || '').trim().toUpperCase() === 'WMS';
      });
      sourceSystem = 'WMS';
    }

    const farms = [];
    const farmSeen = {};
    const farmKeyToName = {};
    const tenantToFarm = {};
    rows.forEach(function (r) {
      const managedRaw = String(r['Managed by'] || r['Managed_by'] || '').trim();
      const managedParsed = _parseFarmFromFlockPattern_(managedRaw) || managedRaw;
      const managedBy = _normalizeFarmLabel_(managedParsed);
      if (!managedBy) return;
      if (_isFactoryLabel_(managedBy)) return;
      const key = managedBy.toLowerCase();
      if (farmSeen[key]) return;
      farmSeen[key] = true;
      farmKeyToName[key] = managedBy;
      farms.push(managedBy);

      const tenantId = String(r['Tenant_id'] || '').trim();
      if (tenantId) {
        tenantToFarm[_normalizeTenantIdKey_(tenantId)] = managedBy;
      }
    });

    farms.sort(_compareFarmName_);

    const flocksByFarm = {};
    farms.forEach(function (farm) {
      flocksByFarm[farm] = [];
    });

    rows.forEach(function (r) {
      const flockId = String(r['FLOCK_ID'] || '').trim();
      if (!flockId) return;

      let farmNameRaw = _deriveFarmNameFromConfigRow_(r);
      if (!farmNameRaw) {
        const tenantId = String(r['Tenant_id'] || '').trim();
        if (tenantId) {
          farmNameRaw = tenantToFarm[_normalizeTenantIdKey_(tenantId)] || '';
        }
      }
      const farmNameNorm = _normalizeFarmLabel_(farmNameRaw);
      const farmKey = String(farmNameNorm || '').toLowerCase();
      if (!farmKey || !farmKeyToName[farmKey]) return;
      const farmName = farmKeyToName[farmKey];
      if (!flocksByFarm[farmName]) return;

      const flockObj = {
        FLOCK_ID: flockId,
        FLOCK_NAME: String(r['FLOCK_NAME'] || '').trim(),
        Tenant_id: String(r['Tenant_id'] || '').trim(),
        Tenant: String(r['Tenant'] || '').trim(),
      };

      const exists = flocksByFarm[farmName].some(function (f) {
        return String(f['FLOCK_ID'] || '').trim() === flockId;
      });
      if (!exists) flocksByFarm[farmName].push(flockObj);
    });

    Object.keys(flocksByFarm).forEach(function (farm) {
      flocksByFarm[farm].sort(function (a, b) {
        return String(a['FLOCK_ID'] || '').localeCompare(String(b['FLOCK_ID'] || ''));
      });
    });

    const payload = {
      farms: farms,
      flocksByFarm: flocksByFarm,
      rows: rows,
      sourceSystem: sourceSystem,
      cacheHit: false,
    };

    cache.put(cacheKey, JSON.stringify(payload), 300);
    return success_(payload);
  } catch (e) {
    Logger_.logError('ConfigService.getFarmFilterData', e);
    return error_(e, 'GET_FARM_FILTER_DATA_FAILED');
  }
}

/**
 * Backward-compatible wrapper cho FE cũ.
 * @param {string} [systemName='FMS']
 */
function getWmsFarmFilterData(systemName) {
  return getFarmFilterData(systemName || 'FMS');
}

function _getFarmFilterCacheKey_(systemName) {
  return 'farm_filter_v1::' + String(systemName || 'FMS').trim().toUpperCase();
}

function _isFactoryLabel_(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return false;
  return /\bfactory\b|\bnha\s*may\b|\bnhà\s*máy\b/.test(text);
}

function _parseFarmFromFlockPattern_(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';

  // Case phổ biến: "Japfa Farm 1 - Flock 1", "Japfa Farm 1/Flock_1",
  // "Japfa Farm 1 | FLOCK 01"... => lấy phần bên trái từ khóa "flock".
  const lower = raw.toLowerCase();
  const flockIdx = lower.indexOf('flock');
  if (flockIdx <= 0) return '';

  let farmPart = raw.substring(0, flockIdx);
  // Bỏ các separator treo cuối chuỗi bên trái.
  farmPart = farmPart.replace(/[\s\-–—_\/|:;,]+$/g, '');
  farmPart = _normalizeFarmLabel_(farmPart);
  return farmPart || '';
}

function _deriveFarmNameFromConfigRow_(row) {
  const managedByRaw = String(row['Managed by'] || row['Managed_by'] || '').trim();
  const managedBy = _parseFarmFromFlockPattern_(managedByRaw) || managedByRaw;
  const fromFlockId = _parseFarmFromFlockPattern_(row['FLOCK_ID']);
  const fromFlockName = _parseFarmFromFlockPattern_(row['FLOCK_NAME']);

  // Ưu tiên cột Managed by cho source farm list; fallback parse từ flock fields.
  if (managedBy && !_isFactoryLabel_(managedBy)) return managedBy;
  if (fromFlockId && !_isFactoryLabel_(fromFlockId)) return fromFlockId;
  if (fromFlockName && !_isFactoryLabel_(fromFlockName)) return fromFlockName;
  return '';
}

function _normalizeFarmLabel_(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function _extractTrailingNumber_(text) {
  const match = String(text || '').trim().match(/(\d+)\s*$/);
  if (!match) return null;
  const num = Number(match[1]);
  return isNaN(num) ? null : num;
}

function _compareFarmName_(a, b) {
  const aNum = _extractTrailingNumber_(a);
  const bNum = _extractTrailingNumber_(b);
  if (aNum !== null && bNum !== null && aNum !== bNum) return aNum - bNum;
  return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });
}

function _normalizeTenantIdKey_(tenantId) {
  if (typeof normalizeTenantId_ === 'function') {
    return String(normalizeTenantId_(tenantId) || '').trim();
  }
  return String(tenantId || '').trim();
}