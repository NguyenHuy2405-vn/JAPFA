/**
 * =============================================================================
 * FILE: OMSService.gs
 * PURPOSE: Đọc/tạo/cập nhật Order — luồng UI hỗ trợ 2 CHIỀU (Nhà máy↔Farm),
 *          khác với luồng API cho AI (chỉ 1 chiều Nhà máy→Farm — TR §0/§9).
 *
 * ⚠️ `Order ID` (cột B) là ARRAY FORMULA SPILL (F13, TR §6) — KHÔNG ghi tay,
 *    KHÔNG dùng appendRowWithFormula_ (đó là cho công thức copy-per-row).
 *    Chỉ cần append data vào cột A trở đi, công thức B tự spill xuống dòng
 *    mới (range mở `A2:A`), đọc lại sau khi flush() để lấy Order ID đã sinh.
 *
 * ⚠️ GIẢ ĐỊNH cần xác nhận (PRD/TR không mô tả rõ cách xác định 1 địa điểm
 *    "Nơi đi"/"Nơi đến" là Nhà máy hay Farm cụ thể): `_resolveLocationScope_`
 *    tra theo `Config.Tenant` (tên hiển thị) — nếu có dòng Config khớp tên
 *    VÀ có `FLOCK_ID` → coi là Farm; ngược lại coi là Nhà máy (factory).
 *    Cần Phúc xác nhận lại nếu Config có Tenant riêng đại diện "Nhà máy"
 *    không gắn Flock nào (khả năng cao là đúng, dựa theo REF-2/TR §4.1).
 *
 * AUTHOR: (placeholder)
 * DEPENDENCIES: Utils.gs, Validation.gs, Auth.gs, ApiResponse.gs, Logger.gs,
 *               Constants.gs, WMSService.gs (checkStockAvailable_,
 *               submitInboundOutbound), ConfigService.gs
 * REFERENCE: Japfa_PRD.md §3.3, §3.4 · Technical Reference F13, REF-5, §4.8
 * =============================================================================
 */

/**
 * Đọc danh sách Order, có filter.
 *
 * @param {Object} [filters] - VD { Client:'Japfa Farm 1', Status: ORDER_STATUS.PENDING }.
 * @returns {{success:boolean, data:Object[]}}
 * @example
 * getOrderList({ Status: 'Chờ giao' });
 */
function getOrderList(filters) {
  try {
    const rows = getSheetData_("OMS").sort(function (a, b) {
      return b.__row - a.__row;
    });
    return success_(filterRows_(rows, filters));
  } catch (e) {
    Logger_.logError("OMSService.getOrderList", e);
    return error_(e, "GET_ORDER_LIST_FAILED");
  }
}

/**
 * Truy vết 1 Order tới các dòng ledger liên quan (PRD §3.3 AC — "link tới
 * các dòng WMS tương ứng").
 *
 * @param {string} orderId
 * @returns {{success:boolean, data:{factory:Object[], farm:Object[]}}}
 * @example
 * getOrderTraceability('WMS_1-ORD-000005');
 */
function getOrderTraceability(orderId) {
  try {
    Validation_.requireField(orderId, "orderId");
    const factoryRows = getSheetData_("WMS_FACTORY").filter(function (r) {
      return String(r["Order ID"]).trim() === String(orderId).trim();
    });
    const farmRows = getSheetData_("WMS_FARM").filter(function (r) {
      return String(r["Order ID"]).trim() === String(orderId).trim();
    });
    return success_({ factory: factoryRows, farm: farmRows });
  } catch (e) {
    Logger_.logError("OMSService.getOrderTraceability", e);
    return error_(e, "GET_ORDER_TRACE_FAILED");
  }
}

/**
 * Tạo Order mới — hỗ trợ 2 chiều Nhà máy↔Farm (PRD §3.4). Sinh `Order ID`
 * tự động, ghi Outbound tại nguồn + Inbound tại đích, đảm bảo nhất quán
 * qua `LockService`. Nếu ghi ledger thất bại SAU KHI đã tạo Order →
 * KHÔNG rollback (quyết định đã chốt PRD §3.4 AC cuối), Status chuyển
 * `ORDER_STATUS.ERROR` để xử lý thủ công.
 *
 * @param {Object} payload
 * @param {string} payload.Tenant_id - Tenant đặt hàng (chủ Order).
 * @param {string} payload.Client
 * @param {string} payload['Mã hàng']
 * @param {number} payload['Số lượng']
 * @param {string} [payload.UOM]
 * @param {string} payload['Nơi đi']
 * @param {string} payload['Nơi đến']
 * @param {string} [payload['Ngày lấy hàng']]
 * @param {string} [payload['Ngày giao hàng (Dự kiến)']]
 * @param {string} [payload.Note]
 * @returns {{success:boolean, data:Object, message:string}}
 * @example
 * createOrder({ Tenant_id:'WMS_1', Client:'Japfa Farm 1', 'Mã hàng':'C01S+',
 *   'Số lượng':5400, UOM:'Bao', 'Nơi đi':'Nhà máy', 'Nơi đến':'Japfa Farm 1' });
 */
function createOrder(payload) {
  try {
    requirePermission_("oms.create");
    Validation_.requireFields(payload, [
      "Tenant_id",
      "Client",
      "Mã hàng",
      "Số lượng",
      "Nơi đi",
      "Nơi đến",
    ]);
    Validation_.requirePositiveNumber(payload["Số lượng"], "Số lượng");
    Validation_.requireDifferent(
      payload["Nơi đi"],
      payload["Nơi đến"],
      "Nơi đi và Nơi đến không được trùng nhau.",
    );

    const qty = Number(payload["Số lượng"]);
    const fromLoc = _resolveLocationScope_(payload["Nơi đi"]);
    const toLoc = _resolveLocationScope_(payload["Nơi đến"]);

    // Validate tồn kho nguồn TRƯỚC khi tạo Order (PRD §3.4 — chặn cứng nếu không đủ)
    if (
      !checkStockAvailable_(
        fromLoc.scope,
        fromLoc.tenantId,
        payload["Mã hàng"],
        qty,
      )
    ) {
      throw new Error(
        'INSUFFICIENT_STOCK::Tồn kho tại "' +
          payload["Nơi đi"] +
          '" không đủ ' +
          qty +
          " " +
          (payload.UOM || "") +
          " để tạo đơn.",
      );
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    let orderResult;
    try {
      orderResult = _appendOmsRow_(payload);
      const orderId = orderResult.orderId;
      if (!orderId) {
        throw new Error(
          "ORDER_ID_GENERATION_FAILED::Không thể sinh Order ID từ công thức trên sheet OMS. " +
            "Kiểm tra lại cột Order ID (Order ID/WMS_Order ID/TMS_ORDER ID).",
        );
      }

      try {
        const outboundResp = submitInboundOutbound({
          scope: fromLoc.scope,
          type: "Outbound",
          Tenant_id: fromLoc.tenantId,
          SKU: payload["Mã hàng"],
          qty: qty,
          orderId: orderId,
          FLOCK_ID: fromLoc.flockId,
          note: "Xuất theo Order " + orderId,
        });
        if (!outboundResp || !outboundResp.success) {
          throw new Error(
            (outboundResp && outboundResp.error) ||
              "Outbound transaction failed.",
          );
        }

        const inboundResp = submitInboundOutbound({
          scope: toLoc.scope,
          type: "Inbound",
          Tenant_id: toLoc.tenantId,
          SKU: payload["Mã hàng"],
          qty: qty,
          orderId: orderId,
          FLOCK_ID: toLoc.flockId,
          note: "Nhập theo Order " + orderId,
        });
        if (!inboundResp || !inboundResp.success) {
          throw new Error(
            (inboundResp && inboundResp.error) || "Inbound transaction failed.",
          );
        }

        _setOrderStatus_(orderResult.rowNumber, ORDER_STATUS.STOCK_DEDUCTED);
      } catch (ledgerErr) {
        // Không rollback tự động — đã chốt PRD §3.4 AC cuối
        Logger_.logError("OMSService.createOrder (ghi ledger)", ledgerErr);
        _setOrderStatus_(orderResult.rowNumber, ORDER_STATUS.ERROR);
        throw new Error(
          "CREATE_ORDER_LEDGER_FAILED::Đã tạo Order " +
            orderId +
            ' nhưng ghi WMS thất bại — Status đã đánh dấu "' +
            ORDER_STATUS.ERROR +
            '". Chi tiết: ' +
            ledgerErr.message,
        );
      }
    } finally {
      lock.releaseLock();
    }

    Logger_.logAudit(
      "OMSService.createOrder",
      "Tạo Order ID=" + orderResult.orderId,
    );
    return success_(
      { orderId: orderResult.orderId, values: orderResult.values },
      "Đã tạo Order " + orderResult.orderId + ".",
    );
  } catch (e) {
    Logger_.logError("OMSService.createOrder", e);
    return error_(e, "CREATE_ORDER_FAILED");
  }
}

/**
 * Cập nhật trạng thái Order (nút cập nhật nhanh — PRD §3.3).
 *
 * ⚠️ Chặn đổi ngược từ `Hoàn tất` → `Chờ giao` theo đề xuất PRD §3.3, NHƯNG
 * đây là quy tắc **chưa được xác nhận chính thức** (PRD ghi rõ "[đề xuất,
 * cần xác nhận]") — nếu Phúc xác nhận KHÔNG cần rule này, xoá đoạn if bên
 * dưới là đủ, không ảnh hưởng chỗ khác.
 *
 * @param {string} orderId
 * @param {string} status - Phải thuộc `ORDER_STATUS`.
 * @returns {{success:boolean, data:Object, message:string}}
 * @example
 * updateOrderStatus('WMS_1-ORD-000005', 'Hoan tat');
 */
function updateOrderStatus(orderId, status) {
  try {
    requirePermission_("oms.status.write");
    Validation_.requireField(orderId, "orderId");
    Validation_.requireField(status, "status");

    const rows = getSheetData_("OMS");
    const row = rows.find(function (r) {
      return (
        String(_getOmsOrderIdFromRow_(r)).trim() === String(orderId).trim()
      );
    });
    if (!row) {
      throw new Error(
        'ORDER_NOT_FOUND::Không tìm thấy Order ID="' + orderId + '".',
      );
    }
    if (
      row["Status"] === ORDER_STATUS.COMPLETED &&
      status === ORDER_STATUS.PENDING
    ) {
      throw new Error(
        'INVALID_STATUS_TRANSITION::Không thể đổi Order đã "' +
          ORDER_STATUS.COMPLETED +
          '" về lại "' +
          ORDER_STATUS.PENDING +
          '" (PRD §3.3, quy tắc đề xuất — chưa xác nhận chính thức).',
      );
    }

    const colMap = {};
    const headers = getSheetHeaders_("OMS");
    colMap[headers.indexOf("Status") + 1] = status;
    if (status === ORDER_STATUS.COMPLETED) {
      const actualDateCol = headers.indexOf("Ngày giao hàng (Thực tế)") + 1;
      if (actualDateCol > 0) colMap[actualDateCol] = new Date();
    }
    updateRowCells_("OMS", row.__row, colMap);

    Logger_.logAudit(
      "OMSService.updateOrderStatus",
      "Order " + orderId + " -> " + status,
    );
    return success_(
      { orderId: orderId, status: status },
      "Đã cập nhật trạng thái đơn hàng.",
    );
  } catch (e) {
    Logger_.logError("OMSService.updateOrderStatus", e);
    return error_(e, "UPDATE_ORDER_STATUS_FAILED");
  }
}

/**
 * Ghi 1 dòng Order mới — bỏ qua cột `Order ID` (formula spill tự điền),
 * flush rồi đọc lại để lấy Order ID vừa sinh.
 *
 * @param {Object} payload
 * @returns {{rowNumber:number, values:Array<*>, orderId:string}}
 * @private
 */
function _appendOmsRow_(payload) {
  const sheet = getSheet_("OMS");
  const headers = getSheetHeaders_("OMS");
  const newRow = sheet.getLastRow() + 1;

  headers.forEach(function (h, idx) {
    if (_isOmsOrderIdHeader_(h)) return; // cột Order ID dạng formula spill, không ghi tay
    const col = idx + 1;
    let val = "";
    switch (h) {
      case "Tenant_id":
        val = payload.Tenant_id;
        break;
      case "Create Date":
        val = new Date();
        break;
      case "Ngày lấy hàng":
        val = payload["Ngày lấy hàng"]
          ? new Date(payload["Ngày lấy hàng"])
          : "";
        break;
      case "Client":
        val = payload.Client;
        break;
      case "Mã hàng":
        val = payload["Mã hàng"];
        break;
      case "Số lượng":
        val = Number(payload["Số lượng"]);
        break;
      case "UOM":
        val = payload.UOM || "";
        break;
      case "Nơi đi":
        val = payload["Nơi đi"];
        break;
      case "Nơi đến":
        val = payload["Nơi đến"];
        break;
      case "Ngày giao hàng (Dự kiến)":
        val = payload["Ngày giao hàng (Dự kiến)"]
          ? new Date(payload["Ngày giao hàng (Dự kiến)"])
          : "";
        break;
      case "Ngày giao hàng (Thực tế)":
        val = "";
        break;
      case "Status":
        val = ORDER_STATUS.PENDING;
        break;
      case "Note":
        val = payload.Note || "";
        break;
      default:
        val = "";
    }
    sheet.getRange(newRow, col).setValue(val);
  });

  SpreadsheetApp.flush(); // ép tính lại để cột B (formula spill) trả đúng Order ID
  const rowValues = sheet.getRange(newRow, 1, 1, headers.length).getValues()[0];

  let orderId = "";
  for (let i = 0; i < headers.length; i++) {
    if (!_isOmsOrderIdHeader_(headers[i])) continue;
    const cellValue = rowValues[i];
    if (
      cellValue !== undefined &&
      cellValue !== null &&
      String(cellValue).trim() !== ""
    ) {
      orderId = String(cellValue).trim();
      break;
    }
  }

  return { rowNumber: newRow, values: rowValues, orderId: orderId };
}

/**
 * Đổi `Status` của 1 dòng OMS theo số dòng thật — helper nội bộ dùng bởi
 * `createOrder()` (không public qua google.script.run).
 * @param {number} rowNumber
 * @param {string} status
 * @private
 */
function _setOrderStatus_(rowNumber, status) {
  const headers = getSheetHeaders_("OMS");
  const colMap = {};
  colMap[headers.indexOf("Status") + 1] = status;
  updateRowCells_("OMS", rowNumber, colMap);
}

/**
 * Nhận diện các biến thể tên cột Order ID trên sheet OMS.
 * @param {string} header
 * @returns {boolean}
 * @private
 */
function _isOmsOrderIdHeader_(header) {
  const normalized = String(header || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return (
    normalized === "orderid" ||
    normalized === "wmsorderid" ||
    normalized === "tmsorderid"
  );
}

/**
 * Lấy Order ID từ 1 dòng OMS, tương thích nhiều layout header.
 * @param {Object} row
 * @returns {string}
 * @private
 */
function _getOmsOrderIdFromRow_(row) {
  if (!row) return "";
  const direct = ["Order ID", "WMS_Order ID", "TMS_ORDER ID"];
  for (let i = 0; i < direct.length; i++) {
    const key = direct[i];
    if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "")
      return String(value).trim();
  }

  const keys = Object.keys(row);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!_isOmsOrderIdHeader_(key)) continue;
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "")
      return String(value).trim();
  }
  return "";
}

/**
 * Xác định 1 địa điểm ("Nơi đi"/"Nơi đến") là Nhà máy hay Farm cụ thể,
 * tra theo `Config.Tenant` (tên hiển thị). Xem GIẢ ĐỊNH ở đầu file.
 *
 * @param {string} locationName
 * @returns {{scope:('factory'|'farm'), tenantId:string, flockId:(string|null)}}
 * @throws {Error} Nếu không tìm thấy Tenant khớp tên trong `Config`.
 * @private
 */
function _resolveLocationScope_(locationName) {
  const configRows = getSheetData_("CONFIG");
  const normalizedLocation = String(locationName || "")
    .trim()
    .toLowerCase();

  if (["nhà máy", "nha may", "factory"].indexOf(normalizedLocation) !== -1) {
    const factoryRow = configRows.find(function (r) {
      return !r["FLOCK_ID"];
    });
    if (factoryRow) {
      return {
        scope: "factory",
        tenantId: factoryRow["Tenant_id"],
        flockId: null,
      };
    }
  }

  const matches = configRows.filter(function (r) {
    const tenantName = String(r["Tenant"] || "")
      .trim()
      .toLowerCase();
    const managedBy = String(r["Managed by"] || "")
      .trim()
      .toLowerCase();
    return (
      tenantName === normalizedLocation || managedBy === normalizedLocation
    );
  });
  if (matches.length === 0) {
    throw new Error(
      'LOCATION_NOT_FOUND::Không tìm thấy "' +
        locationName +
        '" trong danh mục Config (Tenant/Managed by). ' +
        "Kiểm tra lại tên hiển thị hoặc khai báo Config qua View Setup.",
    );
  }
  const farmRow = matches.find(function (r) {
    return r["FLOCK_ID"];
  });
  if (farmRow) {
    return {
      scope: "farm",
      tenantId: farmRow["Tenant_id"],
      flockId: farmRow["FLOCK_ID"],
    };
  }
  return { scope: "factory", tenantId: matches[0]["Tenant_id"], flockId: null };
}
