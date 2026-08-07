/**
 * =============================================================================
 * FILE: FMSService.gs
 * PURPOSE: Đọc dữ liệu `FMS` (đàn gà) cho Dashboard FMS — luồng UI CHỈ ĐỌC
 *          (PRD §1.2, §3.1: "Data-entry cho MORT_act/cập nhật đàn gà trực
 *          tiếp trên UI hiện đi qua luồng API cho AI (updateMort), Dashboard
 *          FMS ở UI chỉ đọc read-only"). File này KHÔNG có hàm ghi nào.
 *
 * ⚠️ Không tự tính lại forecast/estimate — mọi giá trị Estimate/Forecast đã
 *    được tính sẵn bằng công thức spill trên sheet (F4-F10, TR §6). Service
 *    này chỉ đọc, lọc, và gom nhóm theo Tenant/Flock để UI hiển thị.
 *
 * AUTHOR: (placeholder)
 * DEPENDENCIES: Utils.gs, ApiResponse.gs, ConfigService.gs, Constants.gs
 * REFERENCE: Japfa_PRD.md §3.1, §1.2 · Technical Reference §4.5 (F4-F10),
 *            REF-9 (thứ tự phụ thuộc), TD-02 (rủi ro #DIV/0!)
 * =============================================================================
 */

/**
 * Đọc dữ liệu FMS, có filter — dùng cho Dashboard FMS (bảng chi tiết + biểu đồ).
 * Dữ liệu trả về là dữ liệu THÔ đã tính sẵn qua công thức (không tính lại).
 *
 * @param {Object} [filters] - VD { FLOCK_ID:'CKMN0545/0004', 'FEED state':'Actual' }.
 * @returns {{success:boolean, data:Object[]}}
 * @example
 * readFMS({ FLOCK_ID: 'CKMN0545/0004' });
 */
function readFMS(filters) {
  try {
    const rows = getSheetData_("FMS");
    return success_(filterRows_(rows, filters));
  } catch (e) {
    Logger_.logError("FMSService.readFMS", e);
    return error_(e, "READ_FMS_FAILED");
  }
}

/**
 * Tóm tắt tình trạng hiện tại của 1 Flock — dòng gần nhất có `DATE <= hôm
 * nay` (đúng logic dùng chung với `InventoryService.getFarmInventoryStatus`).
 * Dùng cho bảng "Ngày tuổi hiện tại / POPULATION_act gần nhất / MORT tích
 * luỹ / FEED_end_qtty hiện tại" (PRD §3.1).
 *
 * @param {string} flockId
 * @returns {{success:boolean, data:(Object|null)}}
 * @example
 * getFlockCurrentSummary('CKMN0545/0004');
 */
function getFlockCurrentSummary(flockId) {
  try {
    Validation_.requireField(flockId, "flockId");
    const rows = getSheetData_("FMS")
      .filter(function (r) {
        return String(r["FLOCK_ID"]).trim() === String(flockId).trim();
      })
      .sort(function (a, b) {
        return new Date(a["DATE"]) - new Date(b["DATE"]);
      });

    const today = getTodayInTZ_();
    let current = null;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (new Date(rows[i]["DATE"]) <= today) {
        current = rows[i];
        break;
      }
    }
    if (!current && rows.length > 0) current = rows[0];
    if (!current) return success_(null);

    // MORT tích luỹ = tổng MORT_act các dòng Actual của Flock (chỉ cộng số
    // thực tế đã nhập, không cộng MORT_est — tránh nhầm số ước tính thành
    // số chết thật đã xảy ra).
    const mortCumulative = rows
      .filter(function (r) {
        return r["FEED state"] === "Actual";
      })
      .reduce(function (sum, r) {
        return sum + (Number(r["MORT_act"]) || 0);
      }, 0);

    return success_({
      FLOCK_ID: flockId,
      Tenant_id: current["Tenant_id"],
      "Loại Gà": current["Loại Gà"],
      DATE: current["DATE"],
      "Ngày Tuổi": current["Ngày Tuổi"],
      "FEED state": current["FEED state"],
      POPULATION_act: current["POPULATION_act"],
      POPULATION_est: current["POPULATION_est"],
      MORT_cumulative: mortCumulative,
      FEED_NAME: current["FEED_NAME"],
      FEED_end_qtty: current["FEED_end_qtty"],
      "Stock level percentage": current["Stock level percentage"],
      "Inventory Thresholds": current["Inventory Thresholds"],
      badgeColor: INVENTORY_BADGE_COLOR[current["Inventory Thresholds"] || ""],
    });
  } catch (e) {
    Logger_.logError("FMSService.getFlockCurrentSummary", e);
    return error_(e, "GET_FLOCK_SUMMARY_FAILED");
  }
}

/**
 * Tóm tắt tất cả Flock thuộc phạm vi Tenant (hoặc toàn bộ nếu bỏ trống) —
 * dùng cho bảng tổng hợp Dashboard FMS khi user xem nhiều Flock cùng lúc.
 * Chỉ là vòng lặp gọi `getFlockCurrentSummary()` cho từng Flock trong Config.
 *
 * @param {string} [tenantId] - Bỏ trống = tất cả Tenant có Flock (chỉ Admin
 *        nên gọi không truyền tenantId — lọc theo `tenantScope` của Role
 *        thực hiện ở tầng Router/FE, không phải ở đây).
 * @returns {{success:boolean, data:Object[]}}
 * @example
 * getFlockSummaryList('WMS_1');
 */
function getFlockSummaryList(tenantId) {
  try {
    const flocks = getFlockList(tenantId); // ConfigService.gs
    if (!flocks.success) return flocks;

    const targetFlockIds = flocks.data
      .map(function (f) {
        return String(f["FLOCK_ID"] || "").trim();
      })
      .filter(Boolean);

    if (targetFlockIds.length === 0) return success_([]);

    const targetSet = {};
    targetFlockIds.forEach(function (id) {
      targetSet[id] = true;
    });

    const allRows = getSheetData_("FMS");
    const rowsByFlock = {};
    allRows.forEach(function (r) {
      const flockId = String(r["FLOCK_ID"] || "").trim();
      if (!targetSet[flockId]) return;
      if (!rowsByFlock[flockId]) rowsByFlock[flockId] = [];
      rowsByFlock[flockId].push(r);
    });

    const today = getTodayInTZ_();
    const result = targetFlockIds
      .map(function (flockId) {
        const rows = (rowsByFlock[flockId] || []).sort(function (a, b) {
          return new Date(a["DATE"]) - new Date(b["DATE"]);
        });

        let current = null;
        for (let i = rows.length - 1; i >= 0; i--) {
          if (new Date(rows[i]["DATE"]) <= today) {
            current = rows[i];
            break;
          }
        }
        if (!current && rows.length > 0) current = rows[0];
        if (!current) return null;

        const mortCumulative = rows
          .filter(function (r) {
            return r["FEED state"] === "Actual";
          })
          .reduce(function (sum, r) {
            return sum + (Number(r["MORT_act"]) || 0);
          }, 0);

        return {
          FLOCK_ID: flockId,
          Tenant_id: current["Tenant_id"],
          "Loại Gà": current["Loại Gà"],
          DATE: current["DATE"],
          "Ngày Tuổi": current["Ngày Tuổi"],
          "FEED state": current["FEED state"],
          POPULATION_act: current["POPULATION_act"],
          POPULATION_est: current["POPULATION_est"],
          MORT_cumulative: mortCumulative,
          FEED_NAME: current["FEED_NAME"],
          FEED_end_qtty: current["FEED_end_qtty"],
          "Stock level percentage": current["Stock level percentage"],
          "Inventory Thresholds": current["Inventory Thresholds"],
          badgeColor:
            INVENTORY_BADGE_COLOR[current["Inventory Thresholds"] || ""],
        };
      })
      .filter(Boolean);

    return success_(result);
  } catch (e) {
    Logger_.logError("FMSService.getFlockSummaryList", e);
    return error_(e, "GET_FLOCK_SUMMARY_LIST_FAILED");
  }
}

/**
 * Chuỗi Population thực tế vs ước tính theo thời gian cho 1 Flock — dùng
 * vẽ biểu đồ (PRD §3.1 "Biểu đồ Population thực tế vs dự tính").
 *
 * ⚠️ Xử lý TD-02 (`#DIV/0!` tiềm ẩn ở `FMS!P`) và format số âm bất thường
 * (PRD §3.1 AC "không hiển thị số âm gây hiểu lầm"): giá trị lỗi/âm sâu bất
 * thường (population < 0) được set về `null` kèm cờ `hasAnomaly`, để FE tự
 * quyết định hiển thị (ẩn điểm dữ liệu / tooltip cảnh báo) thay vì vẽ nhầm.
 *
 * @param {string} flockId
 * @returns {{success:boolean, data:Object[]}}
 * @example
 * getPopulationChartData('CKMN0545/0004');
 */
function getPopulationChartData(flockId) {
  try {
    Validation_.requireField(flockId, "flockId");
    const rows = getSheetData_("FMS")
      .filter(function (r) {
        return String(r["FLOCK_ID"]).trim() === String(flockId).trim();
      })
      .sort(function (a, b) {
        return new Date(a["DATE"]) - new Date(b["DATE"]);
      });

    const series = rows.map(function (r) {
      const popAct = _cleanNumericOrNull_(r["POPULATION_act"]);
      const popEst = _cleanNumericOrNull_(r["POPULATION_est"]);
      return {
        DATE: r["DATE"],
        "Ngày Tuổi": r["Ngày Tuổi"],
        "FEED state": r["FEED state"],
        POPULATION_act: popAct,
        POPULATION_est: popEst,
        hasAnomaly:
          (popAct !== null && popAct < 0) || (popEst !== null && popEst < 0),
      };
    });

    return success_(series);
  } catch (e) {
    Logger_.logError("FMSService.getPopulationChartData", e);
    return error_(e, "GET_POPULATION_CHART_FAILED");
  }
}

/**
 * Chuẩn hoá 1 giá trị đọc từ sheet: trả về Number hợp lệ, hoặc `null` nếu
 * rỗng/`#DIV/0!`/`#REF!`/NaN — dùng để FE không nhận nhầm string lỗi công
 * thức là số (TD-02).
 *
 * @param {*} value
 * @returns {number|null}
 * @private
 */
function _cleanNumericOrNull_(value) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "string" && value.indexOf("#") === 0) return null; // #DIV/0!, #REF!...
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Cập nhật MORT_act cho 1 dòng FMS theo (FLOCK_ID + DATE).
 * Chỉ cho phép cập nhật cho ngày đã diễn ra hoặc hôm nay theo timezone hệ thống.
 *
 * @param {{flockId:string, date:string, mortAct:number}} payload
 * @returns {{success:boolean, data:Object}}
 */
function updateFmsMortAct(payload) {
  try {
    requirePermission_("fms.mort.write");

    payload = payload || {};
    Validation_.requireFields(payload, ["flockId", "date", "mortAct"]);

    const flockId = String(payload.flockId || "").trim();
    const dateKey = _fmsDateKey_(payload.date);
    if (!dateKey) {
      throw new Error("Ngày dữ liệu FMS không hợp lệ.");
    }

    const todayKey = formatDate_(getTodayInTZ_(), "yyyy-MM-dd");
    if (dateKey > todayKey) {
      throw new Error(
        "Chỉ được phép cập nhật số liệu cho các ngày đã diễn ra hoặc hôm nay",
      );
    }

    const mortAct = Number(payload.mortAct);
    if (!isFinite(mortAct) || mortAct < 0 || Math.floor(mortAct) !== mortAct) {
      throw new Error("Lượng chết phải là số nguyên không âm.");
    }

    const rows = getSheetData_("FMS");
    let target = null;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      if (String(r["FLOCK_ID"] || "").trim() !== flockId) continue;
      if (_fmsDateKey_(r["DATE"] || r["Date"] || r["Ngày thực hiện"]) !== dateKey) continue;
      if (!target) {
        target = r;
        continue;
      }
      // Prefer the Actual row when more than one row shares the same date.
      if (String(r["FEED state"] || "").toLowerCase() === "actual") {
        target = r;
      }
    }

    if (!target || !target.__row) {
      throw new Error("Không tìm thấy dòng FMS để cập nhật.");
    }

    const headers = getSheetHeaders_("FMS");
    const mortActColIdx = headers.findIndex(function (h) {
      return String(h || "").trim().toUpperCase() === "MORT_ACT";
    });
    if (mortActColIdx < 0) {
      throw new Error('Không tìm thấy cột "MORT_act" trên sheet FMS.');
    }

    updateRowCells_("FMS", Number(target.__row), {
      [mortActColIdx + 1]: mortAct,
    });
    SpreadsheetApp.flush();

    return success_({
      FLOCK_ID: flockId,
      DATE: dateKey,
      MORT_act: mortAct,
      __row: Number(target.__row),
    });
  } catch (e) {
    Logger_.logError("FMSService.updateFmsMortAct", e);
    return error_(e, "UPDATE_FMS_MORT_ACT_FAILED");
  }
}

/**
 * Convert input date-like value to yyyy-MM-dd key.
 *
 * @param {*} value
 * @returns {string}
 * @private
 */
function _fmsDateKey_(value) {
  if (value === null || value === undefined || value === "") return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    if (isNaN(value.getTime())) return "";
    return Utilities.formatDate(value, APP_TIMEZONE, "yyyy-MM-dd");
  }

  const text = String(value).trim();
  if (!text) return "";

  const viMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (viMatch) {
    const dd = Number(viMatch[1]);
    const mm = Number(viMatch[2]);
    const yyyy = Number(viMatch[3]);
    return (
      String(yyyy) +
      "-" +
      String(mm).padStart(2, "0") +
      "-" +
      String(dd).padStart(2, "0")
    );
  }

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return (
      String(Number(isoMatch[1])) +
      "-" +
      String(Number(isoMatch[2])).padStart(2, "0") +
      "-" +
      String(Number(isoMatch[3])).padStart(2, "0")
    );
  }

  const parsed = new Date(text);
  if (isNaN(parsed.getTime())) return "";
  return Utilities.formatDate(parsed, APP_TIMEZONE, "yyyy-MM-dd");
}
