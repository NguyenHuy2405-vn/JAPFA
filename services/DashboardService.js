/**
 * =============================================================================
 * FILE: DashboardService.gs
 * PURPOSE: Gom dữ liệu cho 3 Dashboard (FMS/WMS/OMS) — CHỈ tổng hợp/đếm/nhóm
 *          dữ liệu đã có sẵn từ FMSService/InventoryService/OMSService,
 *          KHÔNG tự phát sinh business rule mới (đúng nguyên tắc "AI không
 *          chịu trách nhiệm business logic", business logic đã nằm trọn ở
 *          các Service tương ứng).
 * AUTHOR: (placeholder)
 * DEPENDENCIES: FMSService.gs, InventoryService.gs, OMSService.gs,
 *               ConfigService.gs, Constants.gs
 * REFERENCE: Japfa_PRD.md §3.1 (Dashboard FMS), §3.2 (Dashboard WMS),
 *            §3.3 (Dashboard OMS)
 * =============================================================================
 */

/**
 * Dashboard FMS (PRD §3.1) — bảng tổng hợp Flock + cảnh báo sắp hết cám.
 *
 * @param {string} [tenantId] - Giới hạn theo Tenant (Technical staff);
 *        bỏ trống = tất cả (chỉ Admin nên gọi không truyền — lọc theo
 *        tenantScope thực hiện ở Router/FE dựa trên `getUserRole_()`).
 * @returns {{success:boolean, data:{flocks:Object[], lowStockAlerts:Object[]}}}
 * @example
 * getDashboardFMS('WMS_1');
 */
function getDashboardFMS(tenantId) {
  try {
    const flockSummary = getFlockSummaryList(tenantId);
    if (!flockSummary.success) return flockSummary;

    // Cảnh báo sắp hết thức ăn — dùng chung logic Inventory Status cấp farm
    // (badge Critical/Low/Zero), đúng PRD §3.1: "dùng chung logic Inventory
    // Status của WMS, áp cho farm feed level".
    const lowStockAlerts = flockSummary.data.filter(function (f) {
      return (
        [
          INVENTORY_BADGE.ZERO,
          INVENTORY_BADGE.CRITICAL,
          INVENTORY_BADGE.LOW,
        ].indexOf(f["Inventory Thresholds"]) !== -1
      );
    });

    return success_({
      flocks: flockSummary.data,
      lowStockAlerts: lowStockAlerts,
    });
  } catch (e) {
    Logger_.logError("DashboardService.getDashboardFMS", e);
    return error_(e, "GET_DASHBOARD_FMS_FAILED");
  }
}

/**
 * Dashboard FMS Alerts (CURRENT DAY từ 0 đến 7 mặc định) — trả dữ liệu dạng bảng
 * để FE hiển thị: Ngày | Tên farm | Flock_id | Tên hàng | Status.
 *
 * @param {number} [days=7]
 * @returns {{success:boolean, data:{items:Object[], total:number, days:number}}}
 */
function getDashboardFMSAlertTable(days) {
  try {
    var windowDays = Math.max(0, Number(days) || 7);
    var allowedTenantIds = {
      FLOCK_11: true,
      FLOCK_12: true,
      FLOCK_21: true,
      FLOCK_22: true,
    };
    var statusRank = {};
    statusRank[INVENTORY_BADGE.ZERO] = 3;
    statusRank[INVENTORY_BADGE.CRITICAL] = 2;
    statusRank[INVENTORY_BADGE.LOW] = 1;

    var rawAlerts = getSheetData_("FMS")
      .filter(function (r) {
        var tenantId = String(r["Tenant_id"] || "")
          .trim()
          .toUpperCase();
        if (!allowedTenantIds[tenantId]) return false;

        var badge = r["Inventory Thresholds"];
        if (
          [
            INVENTORY_BADGE.ZERO,
            INVENTORY_BADGE.CRITICAL,
            INVENTORY_BADGE.LOW,
          ].indexOf(badge) === -1
        ) {
          return false;
        }
        var currentDayRaw = String(r["CURRENT DAY"] || "")
          .replace(/,/g, "")
          .trim();
        var currentDay = Number(currentDayRaw);
        if (isNaN(currentDay)) return false;
        return currentDay >= 0 && currentDay <= windowDays;
      })
      .map(function (r) {
        var tenantId = String(r["Tenant_id"] || "").trim();
        var currentDay = Number(
          String(r["CURRENT DAY"] || "")
            .replace(/,/g, "")
            .trim(),
        );
        return {
          DATE: r["DATE"],
          _dateSort: _parseSheetDate_(r["DATE"])
            ? _parseSheetDate_(r["DATE"]).getTime()
            : 0,
          _currentDay: isNaN(currentDay) ? 999999 : currentDay,
          TENANT_ID: tenantId || "-",
          FARM_NAME: tenantId || "-",
          FLOCK_ID: r["FLOCK_ID"] || "-",
          FEED_NAME: r["FEED_NAME"] || r["Tên hàng hóa"] || r["Mã hàng"] || "-",
          STATUS: r["Inventory Thresholds"] || "-",
        };
      })
      .sort(function (a, b) {
        if (a._currentDay !== b._currentDay)
          return a._currentDay - b._currentDay;
        return a._dateSort - b._dateSort;
      });

    var grouped = {};
    rawAlerts.forEach(function (r) {
      var groupKey = r.TENANT_ID + "|" + String(r._currentDay);
      var existing = grouped[groupKey];
      if (!existing) {
        grouped[groupKey] = r;
        return;
      }
      var existingRank = statusRank[existing.STATUS] || 0;
      var nextRank = statusRank[r.STATUS] || 0;
      if (nextRank > existingRank) {
        grouped[groupKey] = r;
      }
    });

    var alerts = Object.keys(grouped)
      .map(function (k) {
        return grouped[k];
      })
      .sort(function (a, b) {
        if (a.TENANT_ID < b.TENANT_ID) return -1;
        if (a.TENANT_ID > b.TENANT_ID) return 1;
        return a._currentDay - b._currentDay;
      });

    var total = alerts.length;
    var items = alerts.map(function (r) {
      return {
        DATE: r.DATE,
        CURRENT_DAY: r._currentDay,
        TENANT_ID: r.TENANT_ID,
        FARM_NAME: r.FARM_NAME,
        FLOCK_ID: r.FLOCK_ID,
        FEED_NAME: r.FEED_NAME,
        STATUS: r.STATUS,
      };
    });

    return success_({
      items: items,
      total: total,
      days: windowDays,
    });
  } catch (e) {
    Logger_.logError("DashboardService.getDashboardFMSAlertTable", e);
    return error_(e, "GET_DASHBOARD_FMS_ALERT_TABLE_FAILED");
  }
}

/**
 * Dashboard WMS (PRD §3.2) — tồn kho Nhà máy (luôn tổng hợp) + Farm (toggle
 * tổng hợp/theo Tenant) kèm lịch sử giao dịch gần nhất.
 *
 * @param {'factory'|'farm'} scope
 * @param {string} [tenantId] - Chỉ áp dụng scope='farm'.
 * @param {number} [recentLimit=10] - Số dòng lịch sử giao dịch gần nhất trả về.
 * @returns {{success:boolean, data:{inventory:Object[], recentTransactions:Object[]}}}
 * @example
 * getDashboardWMS('farm', 'WMS_1');
 * getDashboardWMS('factory');
 */
function getDashboardWMS(scope, tenantId, recentLimit) {
  try {
    const inventory = getInventoryStatus(scope, tenantId); // InventoryService.gs
    if (!inventory.success) return inventory;

    const historyResp = getWmsTransactionHistory(
      scope,
      tenantId ? { Tenant_id: tenantId } : null,
    ); // WMSService.gs
    if (!historyResp.success) return historyResp;

    const limit = recentLimit || 10;
    return success_({
      inventory: inventory.data,
      recentTransactions: historyResp.data.slice(0, limit),
    });
  } catch (e) {
    Logger_.logError("DashboardService.getDashboardWMS", e);
    return error_(e, "GET_DASHBOARD_WMS_FAILED");
  }
}

/**
 * Dashboard OMS (PRD §3.3) — danh sách Order + đếm theo Status (cho card
 * tóm tắt "X đơn Chờ giao / Y đơn Đã trừ kho / Z đơn Hoàn tất").
 *
 * @param {Object} [filters] - Xem `getOrderList` (OMSService.gs).
 * @returns {{success:boolean, data:{orders:Object[], statusCounts:Object<string,number>}}}
 * @example
 * getDashboardOMS({ Tenant_id: 'WMS_1' });
 */
function getDashboardOMS(filters) {
  try {
    const ordersResp = getOrderList(filters); // OMSService.gs
    if (!ordersResp.success) return ordersResp;

    const statusCounts = {};
    Object.keys(ORDER_STATUS).forEach(function (k) {
      statusCounts[ORDER_STATUS[k]] = 0;
    });
    ordersResp.data.forEach(function (o) {
      const st = o["Status"];
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    return success_({ orders: ordersResp.data, statusCounts: statusCounts });
  } catch (e) {
    Logger_.logError("DashboardService.getDashboardOMS", e);
    return error_(e, "GET_DASHBOARD_OMS_FAILED");
  }
}

/**
 * Dashboard tổng hợp cho Admin (landing view mặc định — Constants.gs
 * `ROLE_LANDING_VIEW.Admin = 'dashboard'`) — gộp 3 dashboard con ở mức tóm
 * tắt (không kéo toàn bộ chi tiết để tránh nặng tải).
 *
 * @returns {{success:boolean, data:Object}}
 * @example
 * getDashboardOverview();
 */
function getDashboardOverview() {
  try {
    const fms = getDashboardFMS(); // toàn bộ Tenant — chỉ Admin nên gọi
    const wmsFactory = getFactoryInventoryStatus();
    const wmsFarm = getFarmInventoryStatus();
    const oms = getDashboardOMS();

    return success_({
      fmsAlertCount: fms.success ? fms.data.lowStockAlerts.length : 0,
      factoryInventory: wmsFactory.success ? wmsFactory.data : [],
      farmInventory: wmsFarm.success ? wmsFarm.data : [],
      orderStatusCounts: oms.success ? oms.data.statusCounts : {},
    });
  } catch (e) {
    Logger_.logError("DashboardService.getDashboardOverview", e);
    return error_(e, "GET_DASHBOARD_OVERVIEW_FAILED");
  }
}

/**
 * Parse date value từ Google Sheet thành Date (00:00:00 local) để so sánh
 * cửa sổ thời gian.
 *
 * @param {*} value
 * @returns {Date|null}
 * @private
 */
function _parseSheetDate_(value) {
  if (!value) return null;

  if (Object.prototype.toString.call(value) === "[object Date]") {
    if (isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  var text = String(value).trim();
  if (!text) return null;

  var ddmmyyyy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    var d1 = Number(ddmmyyyy[1]);
    var m1 = Number(ddmmyyyy[2]) - 1;
    var y1 = Number(ddmmyyyy[3]);
    var parsed = new Date(y1, m1, d1);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  var iso = new Date(text);
  if (isNaN(iso.getTime())) return null;
  return new Date(iso.getFullYear(), iso.getMonth(), iso.getDate());
}
