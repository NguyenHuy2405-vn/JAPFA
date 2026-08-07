/**
 * =============================================================================
 * FILE: SetupService.gs
 * PURPOSE: Ghi dữ liệu nền qua View Setup — upsertConfig, upsertProductMaster,
 *          upsertFeedStandard, upsertPolicyThreshold. Đúng theo TR REF-3 và
 *          PRD §3.6.
 *
 * QUY TẮC UPSERT DÙNG CHUNG:
 * - Payload có thể kèm `__confirmUpdate: true` khi FE đã hỏi xác nhận
 *   "cập nhật dòng đã có?" (PRD §3.6 AC) — nếu không có cờ này và khoá đã
 *   tồn tại, hàm ném lỗi DUPLICATE_KEY để FE hiển thị dialog xác nhận.
 * - Luôn ghi kèm `Updated by` = getCurrentUserEmail_() khi sheet có cột này.
 *
 * AUTHOR: (placeholder)
 * DEPENDENCIES: Utils.gs, Validation.gs, Auth.gs, ApiResponse.gs, Logger.gs
 * REFERENCE: Japfa_Technical_Reference.md REF-3, §5 (S1-S4), §6 (F1-F3)
 * =============================================================================
 */

/**
 * S1 — Upsert `Config` (Tenant/Flock). Khoá chính: Tenant_id.
 *
 * @param {Object} payload
 * @param {string} payload.SYSTEM - 'TMS'|'OMS'|'WMS'.
 * @param {string} payload.Tenant
 * @param {string} payload.Tenant_id
 * @param {string} [payload['Managed by']]
 * @param {string} [payload['Address of Tenant']]
 * @param {string} [payload.FLOCK_ID] - Chỉ áp dụng khi Tenant là Farm.
 * @param {string} [payload.FLOCK_NAME]
 * @param {string} [payload['Standards applied']] - Khoá tra Feed_Standard[Loại Gà].
 * @param {number} [payload.Start_flock_count]
 * @param {string} [payload.Start_flock_date]
 * @param {boolean} [payload.__confirmUpdate]
 * @returns {{success:boolean, data:Object, message:string}}
 * @example
 * upsertConfig({ SYSTEM:'WMS', Tenant:'Japfa Farm 2', Tenant_id:'WMS_2' });
 */
function upsertConfig(payload) {
  try {
    requirePermission_("setup.config.write");
    Validation_.requireFields(payload, ["SYSTEM", "Tenant", "Tenant_id"]);

    const existingRows = getSheetData_("CONFIG");
    const existing = Validation_.checkDuplicateKey(
      existingRows,
      "Tenant_id",
      payload.Tenant_id,
      payload.__confirmUpdate,
    );

    const headers = getSheetHeaders_("CONFIG");
    const rowValues = headers.map(function (h) {
      switch (h) {
        case "SYSTEM":
          return payload.SYSTEM;
        case "Tenant":
          return payload.Tenant;
        case "Tenant_id":
          return payload.Tenant_id;
        case "Updated by":
          return getCurrentUserEmail_();
        case "Managed by":
          return payload["Managed by"] || "";
        case "Address of Tenant":
          return payload["Address of Tenant"] || "";
        case "FLOCK_ID":
          return payload.FLOCK_ID || "";
        case "FLOCK_NAME":
          return payload.FLOCK_NAME || "";
        case "Standards applied":
          return payload["Standards applied"] || "";
        case "Start_flock_count":
          return payload.Start_flock_count || "";
        case "Start_flock_date":
          return payload.Start_flock_date
            ? new Date(payload.Start_flock_date)
            : "";
        default:
          return "";
      }
    });

    const sheet = getSheet_("CONFIG");
    if (existing) {
      const colMap = {};
      headers.forEach(function (h, idx) {
        colMap[idx + 1] = rowValues[idx];
      });
      updateRowCells_("CONFIG", existing.__row, colMap);
      Logger_.logAudit(
        "SetupService.upsertConfig",
        "Cập nhật Tenant_id=" + payload.Tenant_id,
      );
      return success_(
        { Tenant_id: payload.Tenant_id, __row: existing.__row },
        "Đã cập nhật Tenant.",
      );
    }

    sheet.appendRow(rowValues);
    Logger_.logAudit(
      "SetupService.upsertConfig",
      "Tạo mới Tenant_id=" + payload.Tenant_id,
    );
    return success_({ Tenant_id: payload.Tenant_id }, "Đã tạo Tenant mới.");
  } catch (e) {
    Logger_.logError("SetupService.upsertConfig", e);
    return error_(e, "UPSERT_CONFIG_FAILED");
  }
}

/**
 * S2 — Upsert `Product_Master`. Khoá chính thật là `SKU`, nhưng SKU là
 * CÔNG THỨC tự sinh từ (Tên hàng hóa + UOM + UOM_weight_kg) — theo TR §6 F1.
 * Vì vậy:
 * - Khi TẠO MỚI: dùng khoá composite [Tên hàng hóa + UOM + UOM_weight_kg]
 *   để chống trùng (vì SKU chưa tồn tại trước khi ghi), sau đó dùng
 *   `appendRowWithFormula_()` để công thức A/F/G/H tự tính, đọc lại SKU
 *   thật để trả về cho FE.
 * - Khi CẬP NHẬT: chỉ cho sửa `Loại sản phẩm`/`Status` (không cho sửa
 *   Tên hàng hóa/UOM/UOM_weight_kg qua đường update, vì sửa 3 field đó
 *   tương đương tạo SKU khác — nếu cần đổi, xoá tay trên sheet gốc,
 *   ngoài phạm vi UI v2).
 *
 * @param {Object} payload
 * @param {string} payload['Tên hàng hóa']
 * @param {string} payload['Loại sản phẩm']
 * @param {string} payload.UOM
 * @param {number} payload.UOM_weight_kg
 * @param {string} [payload.Status='ACTIVE']
 * @param {boolean} [payload.__confirmUpdate]
 * @returns {{success:boolean, data:Object, message:string}}
 * @example
 * upsertProductMaster({ 'Tên hàng hóa':'C05S+', 'Loại sản phẩm':'Chicken_feed', UOM:'Bag', UOM_weight_kg:40 });
 */
function upsertProductMaster(payload) {
  try {
    requirePermission_("setup.productMaster.write");
    Validation_.requireFields(payload, [
      "Tên hàng hóa",
      "UOM",
      "UOM_weight_kg",
    ]);
    Validation_.requirePositiveNumber(payload.UOM_weight_kg, "UOM_weight_kg");

    const existingRows = getSheetData_("PRODUCT_MASTER");
    const existing = existingRows.find(function (r) {
      return (
        String(r["Tên hàng hóa"]).trim() ===
          String(payload["Tên hàng hóa"]).trim() &&
        String(r["UOM"]).trim() === String(payload["UOM"]).trim() &&
        Number(r["UOM_weight_kg"]) === Number(payload["UOM_weight_kg"])
      );
    });

    if (existing && !payload.__confirmUpdate) {
      throw new Error(
        "DUPLICATE_KEY::Sản phẩm [" +
          payload["Tên hàng hóa"] +
          " / " +
          payload["UOM"] +
          " / " +
          payload["UOM_weight_kg"] +
          "kg] đã tồn tại với SKU=" +
          existing["SKU"] +
          ". Xác nhận nếu bạn muốn CẬP NHẬT.",
      );
    }

    if (existing) {
      // Chỉ cho sửa Loại sản phẩm + Status, không đụng vào 3 field cấu thành SKU
      updateRowCells_("PRODUCT_MASTER", existing.__row, {
        3: payload["Loại sản phẩm"] || existing["Loại sản phẩm"],
        9: payload.Status || existing["Status"],
      });
      Logger_.logAudit(
        "SetupService.upsertProductMaster",
        "Cập nhật SKU=" + existing["SKU"],
      );
      return success_(
        { SKU: existing["SKU"], __row: existing.__row },
        "Đã cập nhật sản phẩm.",
      );
    }

    // Tạo mới — cột theo TR §4.2: A=SKU(F1) B=Tên hàng hóa C=Loại sp D=UOM
    // E=UOM_weight_kg F=stock_age_min(F2) G=stock_age_max(F2) H=Mô tả(F3) I=Status
    const rowValues = [
      null, // A - SKU, formula tự tính
      payload["Tên hàng hóa"],
      payload["Loại sản phẩm"] || "",
      payload["UOM"],
      Number(payload["UOM_weight_kg"]),
      null, // F - stock_age_min, formula
      null, // G - stock_age_max, formula
      null, // H - Mô tả, formula
      payload.Status || "ACTIVE",
    ];
    const result = appendRowWithFormula_(
      "PRODUCT_MASTER",
      rowValues,
      [1, 6, 7, 8],
    );
    const newSku = result.values[0];

    Logger_.logAudit(
      "SetupService.upsertProductMaster",
      "Tạo mới SKU=" + newSku,
    );
    return success_(
      { SKU: newSku, __row: result.rowNumber, values: result.values },
      "Đã tạo sản phẩm mới: " + newSku,
    );
  } catch (e) {
    Logger_.logError("SetupService.upsertProductMaster", e);
    return error_(e, "UPSERT_PRODUCT_MASTER_FAILED");
  }
}

/**
 * S3 — Upsert `Feed_Standard`. Khoá chính composite: [Loại Gà + Ngày Tuổi].
 * Sheet KHÔNG có công thức ở các cột này (toàn bộ nhập tay) — ghi trực
 * tiếp bằng sheet.appendRow(), không cần appendRowWithFormula_().
 *
 * ⚠️ Ghi đúng theo layout header row 2 (Config.gs SHEET_LAYOUT) — dùng
 * getSheetHeaders_('FEED_STANDARD') để lấy đúng thứ tự cột theo tên tiếng
 * Việt thật, không hard-code index.
 *
 * @param {Object} payload
 * @param {string} payload['Loại Gà']
 * @param {number} payload['Ngày Tuổi']
 * @param {number} payload['TĂ sử dụng (g/c/n)']
 * @param {number} [payload['Thức ăn sử dụng cộng dồn (g/c)']]
 * @param {number} [payload['Hệ số sử dụng thức ăn']]
 * @param {number} [payload['Hao hụt cộng dồn']]
 * @param {number} [payload['Bình quân khối lượng cơ thể (g)']]
 * @param {string} payload['Loại cám'] - Phải khớp Product_Master['Tên hàng hóa'].
 * @param {boolean} [payload.__confirmUpdate]
 * @returns {{success:boolean, data:Object, message:string}}
 * @example
 * upsertFeedStandard({ 'Loại Gà':'ChoiNoi_Male_GiaLai', 'Ngày Tuổi':11, 'TĂ sử dụng (g/c/n)':32.5, 'Loại cám':'C02S+' });
 */
function upsertFeedStandard(payload) {
  try {
    requirePermission_("setup.feedStandard.write");
    Validation_.requireFields(payload, ["Loại Gà", "Ngày Tuổi", "Loại cám"]);

    const existingRows = getSheetData_("FEED_STANDARD");
    const existing = Validation_.checkDuplicateCompositeKey(
      existingRows,
      ["Loại Gà", "Ngày Tuổi"],
      payload,
      payload.__confirmUpdate,
    );

    const headers = getSheetHeaders_("FEED_STANDARD");
    const rowValues = headers.map(function (h) {
      return payload[h] !== undefined && payload[h] !== null ? payload[h] : "";
    });

    if (existing) {
      const colMap = {};
      headers.forEach(function (h, idx) {
        colMap[idx + 1] = rowValues[idx];
      });
      updateRowCells_("FEED_STANDARD", existing.__row, colMap);
      Logger_.logAudit(
        "SetupService.upsertFeedStandard",
        "Cập nhật [" +
          payload["Loại Gà"] +
          " / ngày " +
          payload["Ngày Tuổi"] +
          "]",
      );
      return success_(
        { __row: existing.__row },
        "Đã cập nhật định mức thức ăn.",
      );
    }

    const sheet = getSheet_("FEED_STANDARD");
    sheet.appendRow(rowValues);
    Logger_.logAudit(
      "SetupService.upsertFeedStandard",
      "Tạo mới [" +
        payload["Loại Gà"] +
        " / ngày " +
        payload["Ngày Tuổi"] +
        "]",
    );
    return success_({}, "Đã tạo định mức thức ăn mới.");
  } catch (e) {
    Logger_.logError("SetupService.upsertFeedStandard", e);
    return error_(e, "UPSERT_FEED_STANDARD_FAILED");
  }
}

/**
 * S4 — Upsert `Policy_Thresholds`. Khoá chính: Mã hàng (SKU).
 * Không có công thức, ghi trực tiếp.
 *
 * @param {Object} payload
 * @param {string} payload['Mã hàng']
 * @param {number} payload.zero_threshold
 * @param {number} payload.critical_threshold
 * @param {number} payload.low_threshold
 * @param {number} payload.high_threshold
 * @param {string} [payload.status='active']
 * @param {string} [payload.note]
 * @param {boolean} [payload.__confirmUpdate]
 * @returns {{success:boolean, data:Object, message:string}}
 * @example
 * upsertPolicyThreshold({ 'Mã hàng':'C05S+_Bag_40', zero_threshold:1, critical_threshold:1.5, low_threshold:3, high_threshold:10 });
 */
function upsertPolicyThreshold(payload) {
  try {
    requirePermission_("setup.policyThreshold.write");
    Validation_.requireFields(payload, [
      "Mã hàng",
      "zero_threshold",
      "critical_threshold",
      "low_threshold",
      "high_threshold",
    ]);

    // Validate thứ tự ngưỡng hợp lý: zero < critical < low <= high (đúng logic REF-8)
    const z = Number(payload.zero_threshold),
      c = Number(payload.critical_threshold),
      l = Number(payload.low_threshold),
      h = Number(payload.high_threshold);
    if (!(z < c && c < l && l <= h)) {
      throw new Error(
        "INVALID_THRESHOLD_ORDER::Ngưỡng phải theo thứ tự: zero_threshold < critical_threshold < low_threshold <= high_threshold.",
      );
    }

    const existingRows = getSheetData_("POLICY_THRESHOLDS");
    const existing = Validation_.checkDuplicateKey(
      existingRows,
      "Mã hàng",
      payload["Mã hàng"],
      payload.__confirmUpdate,
    );

    const headers = getSheetHeaders_("POLICY_THRESHOLDS");
    const rowValues = headers.map(function (h2) {
      switch (h2) {
        case "Mã hàng":
          return payload["Mã hàng"];
        case "zero_threshold":
          return z;
        case "critical_threshold":
          return c;
        case "low_threshold":
          return l;
        case "high_threshold":
          return h;
        case "status":
          return payload.status || "active";
        case "note":
          return payload.note || "";
        default:
          return "";
      }
    });

    if (existing) {
      const colMap = {};
      headers.forEach(function (hh, idx) {
        colMap[idx + 1] = rowValues[idx];
      });
      updateRowCells_("POLICY_THRESHOLDS", existing.__row, colMap);
      Logger_.logAudit(
        "SetupService.upsertPolicyThreshold",
        "Cập nhật Mã hàng=" + payload["Mã hàng"],
      );
      return success_(
        { __row: existing.__row },
        "Đã cập nhật ngưỡng cảnh báo.",
      );
    }

    const sheet = getSheet_("POLICY_THRESHOLDS");
    sheet.appendRow(rowValues);
    Logger_.logAudit(
      "SetupService.upsertPolicyThreshold",
      "Tạo mới Mã hàng=" + payload["Mã hàng"],
    );
    return success_({}, "Đã tạo ngưỡng cảnh báo mới.");
  } catch (e) {
    Logger_.logError("SetupService.upsertPolicyThreshold", e);
    return error_(e, "UPSERT_POLICY_THRESHOLD_FAILED");
  }
}

/**
 * Đọc danh sách Policy_Thresholds cho màn hình Setup (list/filter/search).
 *
 * @param {Object} [filters]
 * @returns {{success:boolean, data:Object[]}}
 */
function getPolicyThresholds(filters) {
  try {
    const rows = getSheetData_("POLICY_THRESHOLDS");
    return success_(filterRows_(rows, filters));
  } catch (e) {
    Logger_.logError("SetupService.getPolicyThresholds", e);
    return error_(e, "GET_POLICY_THRESHOLDS_FAILED");
  }
}
