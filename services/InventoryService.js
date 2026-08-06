/**
 * =============================================================================
 * FILE: InventoryService.gs
 * PURPOSE: Trả về tình trạng tồn kho (Inventory Status) cho Dashboard WMS
 *          và banner Notify ở View Tạo Đơn (PRD §3.2, §3.4).
 *
 * ⚠️ QUYẾT ĐỊNH KIẾN TRÚC ĐÃ CHỐT (Step 0): Tồn kho cuối kỳ đã được tính
 *    sẵn bằng công thức trên sheet (WMS_factory!I "Tồn kho cuối kỳ" - F11;
 *    WMS_farm!L "End_qtty" - F12; FMS!R "Inventory Thresholds" - F10).
 *    Service này CHỈ ĐỌC các giá trị đã tính, KHÔNG cộng dồn/tính lại.
 *
 * ⚠️ KHOẢNG TRỐNG TRONG TÀI LIỆU (cần Product Owner xác nhận thêm):
 *    Badge cảnh báo REF-8 định nghĩa dựa trên "% so với FEED_QTY_USE_est"
 *    — một khái niệm chỉ có ý nghĩa ở cấp FARM/FLOCK (vì FEED_QTY_USE_est
 *    được tính theo Loại Gà + Ngày Tuổi của 1 Flock cụ thể, xem F8).
 *    Ở cấp NHÀ MÁY (WMS_factory), sheet KHÔNG có sẵn công thức nào tính %
 *    tương đương (nhà máy không gắn với 1 Flock, không có "nhu cầu ngày
 *    kế tiếp"). Vì vậy:
 *    - getFarmInventoryStatus(): đọc TRỰC TIẾP FMS!R (badge đã tính sẵn
 *      theo Flock → chính xác 100% theo công thức gốc).
 *    - getFactoryInventoryStatus(): CHỈ trả số lượng tồn kho thô + ngưỡng
 *      cấu hình (Policy_Thresholds) để UI hiển thị tham khảo, badge = ''
 *      (chưa xác định) — KHÔNG tự bịa công thức %. Xem TODO cuối file.
 *
 * AUTHOR: (placeholder)
 * DEPENDENCIES: Utils.gs, ConfigService.gs, Constants.gs
 * REFERENCE: Japfa_Technical_Reference.md REF-8, REF-9, §6 F9/F10
 * =============================================================================
 */

/**
 * Dispatcher chung — dùng bởi WMS Dashboard/View Tạo Đơn.
 *
 * @param {'factory'|'farm'} scope
 * @param {string} [tenantId] - Chỉ áp dụng scope='farm'; bỏ trống = tổng hợp
 *        tất cả farm (PRD §3.2 toggle "Tổng hợp tất cả farm").
 * @returns {{success:boolean, data:Object[]}}
 * @example
 * getInventoryStatus('farm', 'WMS_1');
 * getInventoryStatus('factory');
 */
function getInventoryStatus(scope, tenantId) {
  if (scope === "factory") return getFactoryInventoryStatus();
  if (scope === "farm") return getFarmInventoryStatus(tenantId);
  return error_(
    'SCOPE tồn kho không hợp lệ: "' +
      scope +
      '" (chỉ nhận "factory" hoặc "farm").',
    "INVALID_SCOPE",
  );
}

/**
 * Tình trạng tồn kho FARM — đọc trực tiếp badge đã tính sẵn từ FMS!R theo
 * từng Flock (không tự tính lại % theo REF-8, vì FMS đã tính đúng công thức
 * gốc F10 rồi).
 *
 * Cách xác định "dòng hiện tại" của 1 Flock: dòng FMS có DATE gần nhất
 * (≤ hôm nay) trong chuỗi ngày của Flock đó — vì FMS là 1 dòng/ngày/Flock
 * (đã append tuần tự theo Ngày Tuổi tăng dần).
 *
 * @param {string} [tenantId] - Bỏ trống = tất cả farm có Flock.
 * @returns {{success:boolean, data:Object[]}}
 * @example
 * getFarmInventoryStatus('WMS_1');
 */
function getFarmInventoryStatus(tenantId) {
  try {
    const allWmsRows = getSheetData_("WMS_FARM");
    const allFmsRows = getSheetData_("FMS");
    const today = getTodayInTZ_();

    let configRows = getSheetData_("CONFIG").filter(function (r) {
      return (
        r["FLOCK_ID"] !== "" &&
        r["FLOCK_ID"] !== undefined &&
        r["FLOCK_ID"] !== null
      );
    });
    if (tenantId) {
      configRows = configRows.filter(function (r) {
        return tenantIdEquals_(r["Tenant_id"], tenantId);
      });
    }
    const tenantByFlock = {};
    configRows.forEach(function (r) {
      tenantByFlock[String(r["FLOCK_ID"]).trim()] = {
        Tenant_id: r["Tenant_id"],
        Tenant: r["Tenant"],
      };
    });

    // Nhóm FMS theo (FLOCK_ID, SKU) — FMS dùng cột FEED_NAME làm SKU
    const fmsGroups = {};
    allFmsRows.forEach(function (r) {
      const flockId = String(r["FLOCK_ID"]).trim();
      const sku = String(r["FEED_NAME"]).trim();
      const key = flockId + "|" + sku;
      if (!fmsGroups[key]) fmsGroups[key] = [];
      fmsGroups[key].push(r);
    });
    Object.keys(fmsGroups).forEach(function (key) {
      fmsGroups[key].sort(function (a, b) {
        return new Date(a["DATE"]) - new Date(b["DATE"]);
      });
    });

    // Lấy dòng FMS gần nhất (<= targetDate) theo (flockId, sku); nếu không có dòng nào <= targetDate, lấy dòng đầu tiên
    function getNearestFmsRow_(flockId, sku, targetDate) {
      const rows = fmsGroups[flockId + "|" + sku];
      if (!rows || rows.length === 0) return null;
      let nearest = null;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (new Date(rows[i]["DATE"]) <= targetDate) {
          nearest = rows[i];
          break;
        }
      }
      return nearest || rows[0];
    }

    // Nhóm WMS_FARM theo (FLOCK_ID, SKU)
    const wmsGroups = {};
    allWmsRows.forEach(function (r) {
      const flockId = String(r["FLOCK_ID"]).trim();
      const sku = String(r["SKU"]).trim();
      if (!flockId || flockId === "undefined" || flockId === "null") return;
      const key = flockId + "|" + sku;
      if (!wmsGroups[key]) wmsGroups[key] = [];
      wmsGroups[key].push(r);
    });

    let groupKeys = Object.keys(wmsGroups);
    if (tenantId) {
      groupKeys = groupKeys.filter(function (gk) {
        return tenantByFlock.hasOwnProperty(gk.split("|")[0]);
      });
    }

    const result = groupKeys.map(function (groupKey) {
      const parts = groupKey.split("|");
      const flockId = parts[0];
      const sku = parts[1];

      const rows = wmsGroups[groupKey].slice().sort(function (a, b) {
        return new Date(a["DATE"]) - new Date(b["DATE"]);
      });

      let currentRow = null;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (new Date(rows[i]["DATE"]) <= today) {
          currentRow = rows[i];
          break;
        }
      }
      if (!currentRow && rows.length > 0) currentRow = rows[0];

      const tenantInfo = tenantByFlock[flockId] || {
        Tenant_id: null,
        Tenant: null,
      };

      const fmsRow = getNearestFmsRow_(
        flockId,
        sku,
        new Date(currentRow["DATE"]),
      );
      const badge = fmsRow
        ? fmsRow["Inventory Thresholds"] || INVENTORY_BADGE.EMPTY
        : INVENTORY_BADGE.EMPTY;

      return {
        Tenant_id: tenantInfo.Tenant_id,
        Tenant: tenantInfo.Tenant,
        FLOCK_ID: flockId,
        DATE: currentRow["DATE"],
        SKU: sku,
        currentStock: parseLedgerNumber_(currentRow["End_qtty"]),
        badge: badge,
        badgeColor: INVENTORY_BADGE_COLOR[badge] || INVENTORY_BADGE_COLOR[""],
      };
    });

    return success_(result);
  } catch (e) {
    Logger_.logError("InventoryService.getFarmInventoryStatus", e);
    return error_(e, "GET_FARM_INVENTORY_STATUS_FAILED");
  }
}
/**
 * Tình trạng tồn kho NHÀ MÁY — trả số lượng thô (từ cột đã tính sẵn
 * "Tồn kho cuối kỳ") theo từng SKU, kèm ngưỡng cấu hình để UI tham khảo.
 *
 * ⚠️ badge trả về LUÔN là '' (chưa xác định) — xem giải thích đầu file.
 * UI nên hiển thị số lượng + ngưỡng dạng bảng thay vì badge màu cho tới khi
 * có quyết định chính thức về công thức % ở cấp nhà máy.
 *
 * @returns {{success:boolean, data:Object[]}}
 * @example
 * getFactoryInventoryStatus();
 */
function getFactoryInventoryStatus() {
  try {
    const ledgerRows = getSheetData_("WMS_FACTORY");
    const thresholds = getSheetData_("POLICY_THRESHOLDS");

    // Lấy dòng giao dịch MỚI NHẤT (theo __row, tức thứ tự ghi thực tế) cho mỗi SKU
    const latestBySku = {};
    ledgerRows.forEach(function (r) {
      const sku = r["SKU"];
      if (!sku) return;
      if (!latestBySku[sku] || r.__row > latestBySku[sku].__row) {
        latestBySku[sku] = r;
      }
    });

    const result = Object.keys(latestBySku).map(function (sku) {
      const row = latestBySku[sku];
      const th = thresholds.find(function (t) {
        return skuEquals_(t["Mã hàng"], sku);
      });
      return {
        SKU: sku,
        currentStock: parseLedgerNumber_(row["Tồn kho cuối kỳ"]),
        lastTransactionDate: row["DATE"],
        lastTransactionType: row["Loại giao dịch"],
        thresholds: th
          ? {
              zero: th["zero_threshold"],
              critical: th["critical_threshold"],
              low: th["low_threshold"],
              high: th["high_threshold"],
            }
          : null,
        badge: INVENTORY_BADGE.EMPTY, // xem ghi chú đầu file — chưa có công thức % cấp nhà máy
        badgeColor: INVENTORY_BADGE_COLOR[""],
      };
    });

    return success_(result);
  } catch (e) {
    Logger_.logError("InventoryService.getFactoryInventoryStatus", e);
    return error_(e, "GET_FACTORY_INVENTORY_STATUS_FAILED");
  }
}

/**
 * Lấy tồn kho hiện tại (số lượng thô) của 1 SKU tại 1 địa điểm — dùng nội
 * bộ bởi WMSService.checkStockAvailable_() trước khi tạo Order/Adjustment.
 *
 * @param {'factory'|'farm'} scope
 * @param {string} tenantId
 * @param {string} sku
 * @returns {number} Số lượng tồn hiện tại (0 nếu chưa có giao dịch nào).
 * @example
 * getCurrentStock_('farm', 'WMS_1', 'C01S+_Bag_40');
 */
function getCurrentStock_(scope, tenantId, sku) {
  const sheetKey = scope === "factory" ? "WMS_FACTORY" : "WMS_FARM";
  const endQtyField = scope === "factory" ? "Tồn kho cuối kỳ" : "End_qtty";
  const rows = getSheetData_(sheetKey).filter(function (r) {
    return (
      tenantIdEquals_(r["Tenant_id"], tenantId) && skuEquals_(r["SKU"], sku)
    );
  });
  if (rows.length === 0) return 0;
  const latest = rows.reduce(function (a, b) {
    return b.__row > a.__row ? b : a;
  });
  return parseLedgerNumber_(latest[endQtyField]); // đổi từ Number(...) || 0
}

/**
 * Trả về SKU key đang dùng trong ledger cho 1 tenant/scope, để ghi tiếp nối
 * đúng chuỗi công thức hiện có khi hệ thống đang chuyển đổi key SKU.
 * Nếu chưa có lịch sử thì trả lại SKU đầu vào.
 *
 * @param {'factory'|'farm'} scope
 * @param {string} tenantId
 * @param {string} sku
 * @returns {string}
 */
function resolveLedgerSkuKey_(scope, tenantId, sku) {
  const sheetKey = scope === "factory" ? "WMS_FACTORY" : "WMS_FARM";
  const rows = getSheetData_(sheetKey).filter(function (r) {
    return (
      tenantIdEquals_(r["Tenant_id"], tenantId) && skuEquals_(r["SKU"], sku)
    );
  });
  if (rows.length === 0) return sku;
  const latest = rows.reduce(function (a, b) {
    return b.__row > a.__row ? b : a;
  });
  return latest["SKU"] || sku;
}

/**
 * API công khai cho UI: lấy tồn kho hiện tại theo scope/tenant/sku.
 *
 * @param {'factory'|'farm'} scope
 * @param {string} tenantId
 * @param {string} sku
 * @returns {{success:boolean, data:{currentStock:number, ledgerSku:string}}}
 */
function getCurrentStockSnapshot(scope, tenantId, sku) {
  try {
    Validation_.requireFields({ scope: scope, tenantId: tenantId, sku: sku }, [
      "scope",
      "tenantId",
      "sku",
    ]);
    const ledgerSku = resolveLedgerSkuKey_(scope, tenantId, sku);
    return success_({
      currentStock: getCurrentStock_(scope, tenantId, ledgerSku),
      ledgerSku: ledgerSku,
    });
  } catch (e) {
    Logger_.logError("InventoryService.getCurrentStockSnapshot", e);
    return error_(e, "GET_CURRENT_STOCK_SNAPSHOT_FAILED");
  }
}

/*
 * TODO (chờ Product Owner xác nhận): Định nghĩa công thức % tồn kho cấp
 * NHÀ MÁY để badge Critical/Low/Safe/High/Zero có ý nghĩa giống REF-8.
 * Đề xuất tham khảo: % = currentStock / (tổng FEED_QTY_USE_est của TẤT CẢ
 * Flock đang dùng SKU đó, cộng dồn N ngày tới) — nhưng đây là suy luận,
 * CẦN xác nhận trước khi implement để không tạo ra ngưỡng cảnh báo sai.
 */
