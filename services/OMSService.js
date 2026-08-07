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
 * @param {Object} [filters] - VD { Client:'Japfa Farm 1', Status: ORDER_STATUS.PLANNED }.
 * @returns {{success:boolean, data:Object[]}}
 * @example
 * getOrderList({ Status: 'Lên kế hoạch' });
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
 * tự động và khởi tạo trạng thái `Lên kế hoạch`.
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

    // Validate địa điểm tồn tại trong Config ngay lúc tạo đơn.
    _resolveLocationScope_(payload["Nơi đi"]);
    _resolveLocationScope_(payload["Nơi đến"]);
    payload.FLOCK_ID = _resolveFlockIdFromOmsInput_(
      payload.FLOCK_NAME || payload.FLOCK_ID,
      payload["Nơi đến"],
    );
    _findOmsFlockIdColumnIndex_(getSheetHeaders_("OMS"));

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
 * updateOrderStatus('WMS_1-ORD-000005', 'Hoàn tất');
 */
function updateOrderStatus(orderId, status) {
  try {
    requirePermission_("oms.status.write");
    Validation_.requireField(orderId, "orderId");
    Validation_.requireField(status, "status");

    const allowedStatuses = [
      ORDER_STATUS.PLANNED,
      ORDER_STATUS.PICKED_UP,
      ORDER_STATUS.IN_TRANSIT,
      ORDER_STATUS.COMPLETED,
    ];
    if (allowedStatuses.indexOf(status) === -1) {
      throw new Error(
        'INVALID_STATUS::Trạng thái không hợp lệ: "' + status + '".',
      );
    }

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

    const previousStatus = String(row["Status"] || "").trim();
    const previousLevel = _getOmsStatusLevel_(previousStatus);
    const nextLevel = _getOmsStatusLevel_(status);
    if (previousLevel === 4 && nextLevel < 4) {
      throw new Error(
        'INVALID_STATUS_TRANSITION::Không thể đổi đơn đã "' +
          ORDER_STATUS.COMPLETED +
          '" về stage thấp hơn.',
      );
    }

    const qty = Number(row["Số lượng"] || 0);
    if (!(qty > 0)) {
      throw new Error(
        'INVALID_ORDER_DATA::Số lượng đơn hàng không hợp lệ cho Order ID="' +
          orderId +
          '".',
      );
    }

    // Stage Level 2+ => trừ tồn kho tại điểm đi (WMS_factory), chỉ thực hiện 1 lần.
    if (nextLevel >= 2 && !_hasFactoryOutboundByOrderId_(orderId)) {
      const fromLoc = _resolveLocationScope_(row["Nơi đi"]);
      if (fromLoc.scope !== "factory") {
        throw new Error(
          'INVALID_SOURCE_SCOPE::Điểm đi của Order "' +
            orderId +
            '" không thuộc scope factory.',
        );
      }

      const canDeduct = checkStockAvailable_(
        "factory",
        fromLoc.tenantId,
        row["Mã hàng"],
        qty,
      );
      if (!canDeduct) {
        const ledgerSku = resolveLedgerSkuKey_(
          "factory",
          fromLoc.tenantId,
          row["Mã hàng"],
        );
        const currentStock = getCurrentStock_(
          "factory",
          fromLoc.tenantId,
          ledgerSku,
        );
        throw new Error(
          'INSUFFICIENT_STOCK::Tồn kho tại "' +
            row["Nơi đi"] +
            '" không đủ ' +
            qty +
            ' để chuyển trạng thái. (scope=factory, tenantId=' +
            fromLoc.tenantId +
            ', ledgerSku=' +
            ledgerSku +
            ', currentStock=' +
            currentStock +
            ")",
        );
      }

      const outboundResp = submitInboundOutbound({
        scope: "factory",
        type: "Outbound",
        Tenant_id: fromLoc.tenantId,
        SKU: row["Mã hàng"],
        qty: qty,
        orderId: orderId,
        note: "Xuất theo stage " + status + " | Order " + orderId,
      });
      if (!outboundResp || !outboundResp.success) {
        throw new Error(
          "OUTBOUND_FAILED::" +
            ((outboundResp && outboundResp.error) ||
              "Không thể ghi outbound ở WMS_factory."),
        );
      }
    }

    // Stage Level 4 => cộng tồn kho tại điểm đến (WMS_farm), chỉ thực hiện 1 lần.
    if (nextLevel >= 4 && !_hasFarmInboundByOrderId_(orderId)) {
      const flockId = _getOmsFlockIdFromRow_(row);
      if (!flockId) {
        throw new Error(
          'MISSING_FLOCK_ID::Order "' +
            orderId +
            '" chưa có FLOCK_ID trong OMS. Vui lòng cập nhật flock trước khi Hoàn tất.',
        );
      }
      const farmLoc = _resolveFarmLocationByFlockId_(flockId);
      if (!farmLoc) {
        throw new Error(
          'INVALID_FLOCK_MAPPING::Không tìm thấy cấu hình farm cho FLOCK_ID "' +
            flockId +
            '" của Order "' +
            orderId +
            '".',
        );
      }

      const inboundResp = submitInboundOutbound({
        scope: "farm",
        type: "Inbound",
        Tenant_id: farmLoc.tenantId,
        SKU: row["Mã hàng"],
        qty: qty,
        orderId: orderId,
        FLOCK_ID: farmLoc.flockId,
        note: "Nhập theo stage " + status + " | Order " + orderId,
      });
      if (!inboundResp || !inboundResp.success) {
        throw new Error(
          "INBOUND_FAILED::" +
            ((inboundResp && inboundResp.error) ||
              "Không thể ghi inbound ở WMS_farm."),
        );
      }
    }

    const colMap = {};
    const headers = getSheetHeaders_("OMS");
    const statusCol = _findOmsColumnIndexByAliases_(
      headers,
      ["Status", "Trạng thái"],
      "Status",
    );
    colMap[statusCol] = status;
    if (status === ORDER_STATUS.COMPLETED) {
      const actualDateCol = _findOmsColumnIndexByAliases_(
        headers,
        ["Ngày giao hàng (Thực tế)", "Actual Delivery Date"],
      );
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
 * Cập nhật thông tin 1 Order theo `Order ID`.
 *
 * @param {string} orderId
 * @param {Object} payload
 * @returns {{success:boolean, data:Object, message:string}}
 * @example
 * updateOrder('WMS_1-ORD-000005', { Client:'Farm A', 'Số lượng': 1200 });
 */
function updateOrder(orderId, payload) {
  try {
    requirePermission_("oms.order.write");
    Validation_.requireField(orderId, "orderId");
    if (!payload || typeof payload !== "object") {
      throw new Error("INVALID_PAYLOAD::Thiếu payload cập nhật đơn hàng.");
    }

    const rows = getSheetData_("OMS");
    const row = rows.find(function (r) {
      return String(_getOmsOrderIdFromRow_(r)).trim() === String(orderId).trim();
    });
    if (!row) {
      throw new Error('ORDER_NOT_FOUND::Không tìm thấy Order ID="' + orderId + '".');
    }

    const headers = getSheetHeaders_("OMS");
    const colMap = {};

    const colClient = _findOmsColumnIndexByAliases_(headers, ["Client"], "Client");
    const colSku = _findOmsColumnIndexByAliases_(
      headers,
      ["Mã hàng", "SKU", "Ma hang"],
      "Mã hàng/SKU",
    );
    const colQty = _findOmsColumnIndexByAliases_(
      headers,
      ["Số lượng", "Qty", "So luong"],
      "Số lượng/Qty",
    );
    const colFrom = _findOmsColumnIndexByAliases_(
      headers,
      ["Nơi đi", "From", "Noi di"],
      "Nơi đi",
    );
    const colTo = _findOmsColumnIndexByAliases_(
      headers,
      ["Nơi đến", "To", "Noi den"],
      "Nơi đến",
    );
    const colUom = _findOmsColumnIndexByAliases_(headers, ["UOM", "Đơn vị tính", "Don vi tinh"]);
    const colPickup = _findOmsColumnIndexByAliases_(
      headers,
      ["Ngày lấy hàng", "Pickup Date", "Ngay lay hang"],
    );
    const colEta = _findOmsColumnIndexByAliases_(
      headers,
      ["Ngày giao hàng (Dự kiến)", "ETA", "Ngay giao hang du kien"],
    );
    const colNote = _findOmsColumnIndexByAliases_(headers, ["Note", "Ghi chú", "Ghi chu"]);

    if (Object.prototype.hasOwnProperty.call(payload, "Client")) {
      Validation_.requireField(payload.Client, "Client");
      colMap[colClient] = payload.Client;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "Mã hàng")) {
      Validation_.requireField(payload["Mã hàng"], "Mã hàng");
      colMap[colSku] = payload["Mã hàng"];
    }
    if (Object.prototype.hasOwnProperty.call(payload, "Số lượng")) {
      Validation_.requirePositiveNumber(payload["Số lượng"], "Số lượng");
      colMap[colQty] = Number(payload["Số lượng"]);
    }
    if (Object.prototype.hasOwnProperty.call(payload, "UOM") && colUom > 0) {
      colMap[colUom] = payload.UOM || "";
    }
    if (Object.prototype.hasOwnProperty.call(payload, "Nơi đi")) {
      Validation_.requireField(payload["Nơi đi"], "Nơi đi");
      colMap[colFrom] = payload["Nơi đi"];
    }
    if (Object.prototype.hasOwnProperty.call(payload, "Nơi đến")) {
      Validation_.requireField(payload["Nơi đến"], "Nơi đến");
      colMap[colTo] = payload["Nơi đến"];
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, "FLOCK_NAME") ||
      Object.prototype.hasOwnProperty.call(payload, "FLOCK_ID")
    ) {
      const destination = Object.prototype.hasOwnProperty.call(payload, "Nơi đến")
        ? payload["Nơi đến"]
        : row["Nơi đến"];
      const resolvedFlockId = _resolveFlockIdFromOmsInput_(
        payload.FLOCK_NAME || payload.FLOCK_ID,
        destination,
      );
      colMap[_findOmsFlockIdColumnIndex_(headers)] = resolvedFlockId;
    }

    const fromValue = Object.prototype.hasOwnProperty.call(payload, "Nơi đi")
      ? payload["Nơi đi"]
      : row["Nơi đi"];
    const toValue = Object.prototype.hasOwnProperty.call(payload, "Nơi đến")
      ? payload["Nơi đến"]
      : row["Nơi đến"];
    if (String(fromValue || "").trim() && String(toValue || "").trim()) {
      Validation_.requireDifferent(
        fromValue,
        toValue,
        "Nơi đi và Nơi đến không được trùng nhau.",
      );
    }

    if (Object.prototype.hasOwnProperty.call(payload, "Ngày lấy hàng") && colPickup > 0) {
      colMap[colPickup] = payload["Ngày lấy hàng"]
        ? new Date(payload["Ngày lấy hàng"])
        : "";
    }
    if (Object.prototype.hasOwnProperty.call(payload, "Ngày giao hàng (Dự kiến)") && colEta > 0) {
      colMap[colEta] = payload["Ngày giao hàng (Dự kiến)"]
        ? new Date(payload["Ngày giao hàng (Dự kiến)"])
        : "";
    }
    if (Object.prototype.hasOwnProperty.call(payload, "Note") && colNote > 0) {
      colMap[colNote] = payload.Note || "";
    }

    Object.keys(colMap).forEach(function (k) {
      if (Number(k) <= 0) {
        throw new Error(
          'SHEET_SCHEMA_MISSING::Thiếu cột bắt buộc trên sheet OMS (key=' + k + ').',
        );
      }
    });

    if (Object.keys(colMap).length === 0) {
      return success_({ orderId: orderId }, "Không có thay đổi nào để cập nhật.");
    }

    updateRowCells_("OMS", row.__row, colMap);
    Logger_.logAudit("OMSService.updateOrder", "Cập nhật Order ID=" + orderId);
    return success_({ orderId: orderId }, "Đã cập nhật đơn hàng.");
  } catch (e) {
    Logger_.logError("OMSService.updateOrder", e);
    return error_(e, "UPDATE_ORDER_FAILED");
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
    const normalizedHeader = String(h || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    let val;
    let shouldWrite = true;
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
      case "FLOCK_ID":
        val = payload.FLOCK_ID || "";
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
        val = ORDER_STATUS.PLANNED;
        break;
      case "Note":
        val = payload.Note || "";
        break;
      default:
        if (normalizedHeader === "flockid") {
          val = payload.FLOCK_ID || "";
        } else {
          // Không ghi đè các cột công thức/metadata không thuộc payload tạo đơn.
          shouldWrite = false;
        }
    }
    if (shouldWrite) {
      sheet.getRange(newRow, col).setValue(val);
    }
  });

  SpreadsheetApp.flush(); // ép tính lại để cột B (formula spill) trả đúng Order ID
  const rowValues = sheet.getRange(newRow, 1, 1, headers.length).getValues()[0];

  let orderId = "";
  for (let i = 0; i < headers.length; i++) {
    if (!_isOmsPrimaryOrderIdHeader_(headers[i])) continue;
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

  // Fallback: nếu công thức Order ID trên sheet không sinh được, sinh ID bằng code.
  if (!orderId) {
    orderId = _generateFallbackOmsOrderId_(payload.Tenant_id);
    const orderIdCol = headers.findIndex(function (h) {
      return _isOmsPrimaryOrderIdHeader_(h);
    });
    if (orderIdCol >= 0) {
      sheet.getRange(newRow, orderIdCol + 1).setValue(orderId);
      SpreadsheetApp.flush();
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
 * Nhận diện cột ORDER ID gốc của OMS (không phải TMS_Order ID).
 * @param {string} header
 * @returns {boolean}
 * @private
 */
function _isOmsPrimaryOrderIdHeader_(header) {
  const normalized = String(header || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return normalized === "orderid" || normalized === "wmsorderid";
}

/**
 * Sinh fallback Order ID theo format {TENANT_ID}-ORD-000001 khi công thức sheet lỗi.
 * @param {string} tenantId
 * @returns {string}
 * @private
 */
function _generateFallbackOmsOrderId_(tenantId) {
  const rows = getSheetData_("OMS");
  const prefix = String(tenantId || "") + "-ORD-";
  let maxSeq = 0;

  rows.forEach(function (r) {
    const id = String(_getOmsOrderIdFromRow_(r) || "").trim();
    if (!id) return;
    if (id.indexOf(prefix) !== 0) return;
    const match = id.match(/-ORD-(\d+)$/);
    if (!match) return;
    const seq = parseInt(match[1], 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  });

  return prefix + String(maxSeq + 1).padStart(6, "0");
}

/**
 * Lấy Order ID từ 1 dòng OMS, tương thích nhiều layout header.
 * @param {Object} row
 * @returns {string}
 * @private
 */
function _getOmsOrderIdFromRow_(row) {
  if (!row) return "";
  const direct = ["Order ID", "WMS_Order ID", "ORDER ID"];
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
    if (!_isOmsPrimaryOrderIdHeader_(key)) continue;
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "")
      return String(value).trim();
  }

  // Backward-compat: dữ liệu cũ có thể chỉ còn TMS_ORDER ID.
  if (Object.prototype.hasOwnProperty.call(row, "TMS_ORDER ID")) {
    const tmsValue = row["TMS_ORDER ID"];
    if (
      tmsValue !== undefined &&
      tmsValue !== null &&
      String(tmsValue).trim() !== ""
    ) {
      return String(tmsValue).trim();
    }
  }
  return "";
}

/**
 * Tìm vị trí cột trên OMS theo nhiều alias header, không phân biệt dấu/kiểu viết.
 * @param {string[]} headers
 * @param {string[]} aliases
 * @param {string=} requiredLabel
 * @returns {number}
 * @private
 */
function _findOmsColumnIndexByAliases_(headers, aliases, requiredLabel) {
  const normalizedTargets = (aliases || []).map(function (a) {
    return String(a || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  });
  const idx = (headers || []).findIndex(function (h) {
    const normalizedHeader = String(h || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    return normalizedTargets.indexOf(normalizedHeader) !== -1;
  });
  if (idx < 0 && requiredLabel) {
    throw new Error(
      'SHEET_SCHEMA_MISSING::Sheet OMS thiếu cột bắt buộc "' +
        requiredLabel +
        '".',
    );
  }
  return idx >= 0 ? idx + 1 : 0;
}

/**
 * Resolve flock input từ UI (FLOCK_NAME hoặc FLOCK_ID) thành FLOCK_ID thật.
 * @param {string} flockInput
 * @param {string} destinationName
 * @returns {string}
 * @private
 */
function _resolveFlockIdFromOmsInput_(flockInput, destinationName) {
  const value = String(flockInput || "").trim();
  if (!value) {
    throw new Error(
      'MISSING_FLOCK::Vui lòng chọn flock cho điểm đến "' +
        destinationName +
        '".',
    );
  }

  const rows = getSheetData_("CONFIG");
  const allFlocks = rows.filter(function (r) {
    return String(r["FLOCK_ID"] || "").trim() !== "";
  });
  const normalizedDestination = String(destinationName || "")
    .trim()
    .toLowerCase();
  const scopedFlocks = allFlocks.filter(function (r) {
    const tenant = String(r["Tenant"] || "")
      .trim()
      .toLowerCase();
    return tenant === normalizedDestination;
  });

  const normalizedValue = value.toLowerCase();
  function isMatched_(row) {
    const flockId = String(row["FLOCK_ID"] || "").trim().toLowerCase();
    const flockName = String(row["FLOCK_NAME"] || "").trim().toLowerCase();
    return flockId === normalizedValue || flockName === normalizedValue;
  }

  const scopedMatched = scopedFlocks.filter(isMatched_);
  if (scopedMatched.length > 0) {
    return String(scopedMatched[0]["FLOCK_ID"] || "").trim();
  }

  const globalMatched = allFlocks.filter(isMatched_);
  if (globalMatched.length === 1) {
    return String(globalMatched[0]["FLOCK_ID"] || "").trim();
  }
  if (globalMatched.length > 1) {
    throw new Error(
      'FLOCK_AMBIGUOUS::Flock "' +
        value +
        '" trùng nhiều cấu hình. Vui lòng chọn flock thuộc đúng farm đích.',
    );
  }

  throw new Error(
    'FLOCK_NOT_FOUND::Không tìm thấy flock "' +
      value +
      '" trong Config.',
  );
}

/**
 * Tìm cột FLOCK_ID trên OMS (hỗ trợ biến thể header).
 * @param {string[]} headers
 * @returns {number}
 * @private
 */
function _findOmsFlockIdColumnIndex_(headers) {
  const idx = headers.findIndex(function (h) {
    const normalized = String(h || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    return normalized === "flockid";
  });
  if (idx < 0) {
    throw new Error(
      'SHEET_SCHEMA_MISSING::Sheet OMS chưa có cột "FLOCK_ID".',
    );
  }
  return idx + 1;
}

/**
 * Lấy FLOCK_ID từ dòng OMS.
 * @param {Object} row
 * @returns {string}
 * @private
 */
function _getOmsFlockIdFromRow_(row) {
  if (!row) return "";
  const keys = ["FLOCK_ID", "FLOCK ID", "Flock ID"];
  for (let i = 0; i < keys.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(row, keys[i])) continue;
    const v = row[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

/**
 * Resolve tenant farm + flock theo FLOCK_ID trong Config.
 * @param {string} flockId
 * @returns {{tenantId:string, flockId:string}|null}
 * @private
 */
function _resolveFarmLocationByFlockId_(flockId) {
  const target = String(flockId || "").trim().toLowerCase();
  if (!target) return null;
  const row = getSheetData_("CONFIG").find(function (r) {
    return String(r["FLOCK_ID"] || "").trim().toLowerCase() === target;
  });
  if (!row) return null;
  return {
    tenantId: String(row["Tenant_id"] || "").trim(),
    flockId: String(row["FLOCK_ID"] || "").trim(),
  };
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

  function isFactoryRow_(row) {
    return !String(row["FLOCK_ID"] || "").trim();
  }

  function isWmsRow_(row) {
    const system = String(row["SYSTEM"] || "")
      .trim()
      .toUpperCase();
    const tenantId = String(row["Tenant_id"] || "")
      .trim()
      .toUpperCase();
    return system === "WMS" || /^WMS_?\d+$/.test(tenantId);
  }

  function pickBestFactoryRow_(rows) {
    const factories = (rows || []).filter(isFactoryRow_);
    if (factories.length === 0) return null;
    return factories.find(isWmsRow_) || factories[0];
  }

  if (["nhà máy", "nha may", "factory"].indexOf(normalizedLocation) !== -1) {
    const factoryRow = pickBestFactoryRow_(configRows);
    if (factoryRow) {
      return {
        scope: "factory",
        tenantId: factoryRow["Tenant_id"],
        flockId: null,
      };
    }
  }

  const tenantMatches = configRows.filter(function (r) {
    const tenantName = String(r["Tenant"] || "")
      .trim()
      .toLowerCase();
    return tenantName === normalizedLocation;
  });

  // Ưu tiên match theo Tenant (tên địa điểm thật). Nếu Tenant trùng tên nhà máy
  // thì phải trả về scope=factory, tránh map nhầm qua farm do cột Managed by.
  if (tenantMatches.length > 0) {
    const factoryRow = pickBestFactoryRow_(tenantMatches);
    if (factoryRow) {
      return {
        scope: "factory",
        tenantId: factoryRow["Tenant_id"],
        flockId: null,
      };
    }
    return {
      scope: "farm",
      tenantId: tenantMatches[0]["Tenant_id"],
      flockId: tenantMatches[0]["FLOCK_ID"] || null,
    };
  }

  const managedByMatches = configRows.filter(function (r) {
    const managedBy = String(r["Managed by"] || "")
      .trim()
      .toLowerCase();
    return managedBy === normalizedLocation;
  });

  // Match theo Managed by mặc định là địa điểm nhà máy quản lý nhiều farm.
  // Cố gắng tìm dòng factory cùng tên; nếu không có thì fallback factory đầu tiên.
  if (managedByMatches.length > 0) {
    const factoryByTenantName = pickBestFactoryRow_(configRows.filter(function (r) {
      const tenantName = String(r["Tenant"] || "")
        .trim()
        .toLowerCase();
      return tenantName === normalizedLocation;
    }));
    if (factoryByTenantName) {
      return {
        scope: "factory",
        tenantId: factoryByTenantName["Tenant_id"],
        flockId: null,
      };
    }

    const anyFactoryRow = pickBestFactoryRow_(configRows);
    if (anyFactoryRow) {
      return {
        scope: "factory",
        tenantId: anyFactoryRow["Tenant_id"],
        flockId: null,
      };
    }
  }

  if (managedByMatches.length === 0) {
    throw new Error(
      'LOCATION_NOT_FOUND::Không tìm thấy "' +
        locationName +
        '" trong danh mục Config (Tenant/Managed by). ' +
        "Kiểm tra lại tên hiển thị hoặc khai báo Config qua View Setup.",
    );
  }

  // Trường hợp dữ liệu Config thiếu dòng factory: fallback farm đầu tiên để giữ backward-compat.
  return {
    scope: "farm",
    tenantId: managedByMatches[0]["Tenant_id"],
    flockId: managedByMatches[0]["FLOCK_ID"] || null,
  };
}

/**
 * Gợi ý nhóm ghép đơn TMS — filter thuần theo thứ tự ưu tiên:
 * Nơi đến -> Ngày lấy hàng -> tổng khối lượng <= 8 tấn (MERGE_MAX_WEIGHT_TON).
 * Chỉ xét các Order ở trạng thái `Lên kế hoạch` và chưa có `TMS_Order ID`.
 *
 * Khối lượng (tấn) = Số lượng * WEIGHT_PER_UNIT_KG / 1000 (fix cứng 40kg/đơn vị,
 * TODO: thay bằng bảng quy đổi theo SKU khi có).
 *
 * @param {Object} [filters] - Lọc tập Order đầu vào trước khi gợi ý, VD { Tenant_id: 'WMS_1' }.
 * @returns {{success:boolean, data:Array<{key:Object, orderIds:string[], totalWeightTon:number}>}}
 * @example
 * getOrderMergeSuggestions({ Tenant_id: 'WMS_1' });
 */
function getOrderMergeSuggestions(filters) {
  try {
    const WEIGHT_PER_UNIT_KG = 40;
    const MERGE_MAX_WEIGHT_TON = 8;

    let rows = getSheetData_('OMS').filter(function (r) {
      return _isOrderPlanned_(r) && !_hasTmsOrderId_(r);
    });
    if (filters) {
      rows = filterRows_(rows, filters);
    }

    // Nhóm theo (Nơi đến, Ngày lấy hàng)
    const groups = {};
    rows.forEach(function (r) {
      const destKey = String(r['Nơi đến'] || '').trim();
      const dateKey = r['Ngày lấy hàng'] ? Utilities.formatDate(new Date(r['Ngày lấy hàng']), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '';
      const groupKey = destKey + '|' + dateKey;
      if (!groups[groupKey]) groups[groupKey] = { destKey: destKey, dateKey: dateKey, rows: [] };
      groups[groupKey].rows.push(r);
    });

    // Trong mỗi nhóm (Nơi đến, Ngày lấy hàng), tiếp tục gom thành các batch <= 8 tấn
    // (greedy: sắp theo Order ID để ổn định, cộng dồn tới khi vượt 8 tấn thì tách batch mới)
    const suggestions = [];
    Object.keys(groups).forEach(function (groupKey) {
      const group = groups[groupKey];
      const sortedRows = group.rows.slice().sort(function (a, b) {
        return String(_getOmsOrderIdFromRow_(a)).localeCompare(String(_getOmsOrderIdFromRow_(b)));
      });

      let currentBatch = [];
      let currentWeight = 0;
      sortedRows.forEach(function (r) {
        const weightTon = Number(r['Số lượng'] || 0) * WEIGHT_PER_UNIT_KG / 1000;
        if (currentBatch.length > 0 && currentWeight + weightTon > MERGE_MAX_WEIGHT_TON) {
          suggestions.push({
            key: { 'Nơi đến': group.destKey, 'Ngày lấy hàng': group.dateKey },
            orderIds: currentBatch.map(function (row) { return _getOmsOrderIdFromRow_(row); }),
            totalWeightTon: currentWeight
          });
          currentBatch = [];
          currentWeight = 0;
        }
        currentBatch.push(r);
        currentWeight += weightTon;
      });
      if (currentBatch.length > 0) {
        suggestions.push({
          key: { 'Nơi đến': group.destKey, 'Ngày lấy hàng': group.dateKey },
          orderIds: currentBatch.map(function (row) { return _getOmsOrderIdFromRow_(row); }),
          totalWeightTon: currentWeight
        });
      }
    });

    return success_(suggestions);
  } catch (e) {
    Logger_.logError('OMSService.getOrderMergeSuggestions', e);
    return error_(e, 'GET_ORDER_MERGE_SUGGESTIONS_FAILED');
  }
}
/**
 * Ghép nhiều Order thành 1 lô vận chuyển TMS — sinh `TMS_Order ID` mới và
 * ghi vào tất cả Order trong từng nhóm. Đây là nghiệp vụ THỦ CÔNG: user có
 * toàn quyền chọn Order để ghép, KHÔNG bắt buộc theo đúng gợi ý từ
 * getOrderMergeSuggestions() (gợi ý chỉ là filter/group tham khảo).
 *
 * ⚠️ QUY TẮC SINH ID: Đếm số lớn nhất hiện có trong cột `TMS_Order ID` của
 * sheet OMS (dạng "TMS-000x"), +1 cho mỗi nhóm mới — SINH Ở BACKEND (Apps
 * Script tự đếm), KHÁC với `Order ID` (cột B, array formula spill — xem
 * ghi chú đầu file OMSService.gs). Toàn bộ xử lý nằm trong 1 LockService
 * để tránh trùng số khi có nhiều request đồng thời.
 *
 * ⚠️ VALIDATE (fail-fast, không ghi dở dang): mỗi Order ID trong toàn bộ
 * request phải (1) tồn tại, (2) ở trạng thái Lên kế hoạch, (3) chưa có
 * TMS_Order ID, (4) không bị lặp giữa các nhóm hoặc trong cùng 1 nhóm.
 * Nếu có 1 Order vi phạm, TOÀN BỘ request bị từ chối trước khi ghi bất kỳ
 * dòng nào — tránh tạo TMS ID nửa vời khi 1 nhóm sau đó lỗi.
 *
 * @param {string[][]} orderIdGroups - Mảng-của-mảng Order ID, VD:
 *        [["WMS_1-ORD-000001","WMS_1-ORD-000002"], ["WMS_1-ORD-000005"]].
 *        Mỗi nhóm con sinh 1 TMS_Order ID mới; nhóm 1 phần tử = đơn lẻ.
 * @returns {{success:boolean, data:Array<{tmsOrderId:string, orderIds:string[]}>, message:string}}
 * @throws {Error} Nếu 1 Order ID không tồn tại/không ở trạng thái Lên kế hoạch/đã có TMS_Order ID/trùng lặp.
 * @example
 * createTmsIds([["WMS_1-ORD-000001","WMS_1-ORD-000002"], ["WMS_1-ORD-000005"]]);
 * // -> { success:true, data:[
 * //      { tmsOrderId:'TMS-0001', orderIds:['WMS_1-ORD-000001','WMS_1-ORD-000002'] },
 * //      { tmsOrderId:'TMS-0002', orderIds:['WMS_1-ORD-000005'] }
 * //    ]}
 */
function createTmsIds(orderIdGroups) {
  try {
    requirePermission_("oms.tms.write");
    if (!Array.isArray(orderIdGroups) || orderIdGroups.length === 0) {
      throw new Error(
        'Trường "orderIdGroups" phải là mảng-của-mảng Order ID, không được rỗng.',
      );
    }
    orderIdGroups.forEach(function (group, idx) {
      if (!Array.isArray(group) || group.length === 0) {
        throw new Error(
          "Nhóm ghép đơn thứ " + (idx + 1) + " phải là mảng Order ID, không được rỗng.",
        );
      }
    });

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    let results;
    try {
      const tmsCol = _ensureOmsTmsOrderIdColumn_();

      const rows = getSheetData_("OMS");

      // Gom toàn bộ Order ID trong request, chặn trùng trước khi tra cứu
      const allOrderIds = [];
      orderIdGroups.forEach(function (group) {
        group.forEach(function (id) {
          allOrderIds.push(String(id).trim());
        });
      });
      const seen = {};
      allOrderIds.forEach(function (id) {
        if (seen[id]) {
          throw new Error(
            'DUPLICATE_ORDER_IN_REQUEST::Order ID "' +
              id +
              '" xuất hiện nhiều lần trong yêu cầu ghép đơn.',
          );
        }
        seen[id] = true;
      });

      // Validate từng Order — fail-fast, chưa ghi gì ở bước này
      const rowByOrderId = {};
      allOrderIds.forEach(function (id) {
        const row = rows.find(function (r) {
          return String(_getOmsOrderIdFromRow_(r)).trim() === id;
        });
        if (!row) {
          throw new Error(
            'ORDER_NOT_FOUND::Không tìm thấy Order ID="' + id + '".',
          );
        }
        if (!_isOrderPlanned_(row)) {
          throw new Error(
            'INVALID_ORDER_STATUS::Order "' +
              id +
              '" không ở trạng thái "' +
              ORDER_STATUS.PLANNED +
              '", không thể ghép TMS.',
          );
        }
        const existingTms = _getOmsTmsOrderIdFromRow_(row);
        if (existingTms) {
          throw new Error(
            'ORDER_ALREADY_MERGED::Order "' +
              id +
              '" đã thuộc lô TMS_Order ID="' +
              existingTms +
              '".',
          );
        }
        rowByOrderId[id] = row;
      });

      // Tìm số lớn nhất hiện có trong cột TMS_Order ID (dạng "TMS-000x")
      let maxSeq = 0;
      rows.forEach(function (r) {
        const val = _getOmsTmsOrderIdFromRow_(r);
        const match = val.match(/^TMS-0*(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSeq) maxSeq = num;
        }
      });

      // Sinh TMS_Order ID cho từng nhóm và ghi vào các dòng tương ứng
      results = orderIdGroups.map(function (group) {
        maxSeq += 1;
        const tmsOrderId = "TMS-" + String(maxSeq).padStart(4, "0");
        const cleanIds = group.map(function (id) {
          return String(id).trim();
        });
        cleanIds.forEach(function (id) {
          const row = rowByOrderId[id];
          const colMap = {};
          colMap[tmsCol] = tmsOrderId;
          updateRowCells_("OMS", row.__row, colMap);
        });
        return { tmsOrderId: tmsOrderId, orderIds: cleanIds };
      });
    } finally {
      lock.releaseLock();
    }

    results.forEach(function (r) {
      Logger_.logAudit(
        "OMSService.createTmsIds",
        "Ghép " +
          r.orderIds.length +
          " order -> TMS_Order ID=" +
          r.tmsOrderId +
          " [" +
          r.orderIds.join(", ") +
          "]",
      );
    });

    return success_(
      results,
      "Đã tạo " + results.length + " lô vận chuyển TMS.",
    );
  } catch (e) {
    Logger_.logError("OMSService.createTmsIds", e);
    return error_(e, "CREATE_TMS_IDS_FAILED");
  }
}

/**
 * Tạo TMS ID cho toàn bộ đơn chưa hoàn thành và chưa có TMS_Order ID.
 * Mỗi đơn được gán 1 TMS ID riêng (1 nhóm/1 đơn) để đảm bảo không mất truy vết.
 *
 * @returns {{success:boolean, data:Array<{tmsOrderId:string, orderIds:string[]}>, message:string}}
 */
function createTmsIdsForUnfinishedOrders() {
  try {
    const rows = getSheetData_("OMS").filter(function (r) {
      return _isOrderUnfinished_(r) && !_hasTmsOrderId_(r);
    });

    const groups = rows
      .map(function (r) {
        return String(_getOmsOrderIdFromRow_(r) || "").trim();
      })
      .filter(function (id) {
        return !!id;
      })
      .map(function (id) {
        return [id];
      });

    if (groups.length === 0) {
      return success_([], "Không có đơn chưa hoàn thành nào cần tạo TMS ID.");
    }
    return createTmsIds(groups);
  } catch (e) {
    Logger_.logError("OMSService.createTmsIdsForUnfinishedOrders", e);
    return error_(e, "CREATE_TMS_IDS_FOR_UNFINISHED_FAILED");
  }
}

/**
 * Quy đổi trạng thái OMS sang level stage.
 * @param {string} status
 * @returns {number}
 * @private
 */
function _getOmsStatusLevel_(status) {
  const s = String(status || "").trim();
  if (s === ORDER_STATUS.PLANNED) return 1;
  if (s === ORDER_STATUS.PICKED_UP) return 2;
  if (s === ORDER_STATUS.IN_TRANSIT) return 3;
  if (s === "Hoan tat") return 4; // legacy data
  if (s === ORDER_STATUS.COMPLETED) return 4;
  return 0;
}

/**
 * Kiểm tra đã có outbound ở WMS_factory cho order chưa.
 * @param {string} orderId
 * @returns {boolean}
 * @private
 */
function _hasFactoryOutboundByOrderId_(orderId) {
  const rows = getSheetData_("WMS_FACTORY");
  const target = String(orderId || "").trim();
  return rows.some(function (r) {
    const rid = String(r["Order ID"] || "").trim();
    const txn = String(r["Loại giao dịch"] || "").trim().toLowerCase();
    return rid === target && txn === "outbound";
  });
}

/**
 * Kiểm tra đã có inbound ở WMS_farm cho order chưa.
 * @param {string} orderId
 * @returns {boolean}
 * @private
 */
function _hasFarmInboundByOrderId_(orderId) {
  const rows = getSheetData_("WMS_FARM");
  const target = String(orderId || "").trim();
  return rows.some(function (r) {
    const rid = String(r["Order ID"] || "").trim();
    const txn = String(r["Loại giao dịch"] || "").trim().toLowerCase();
    return rid === target && txn === "inbound";
  });
}

/**
 * Xác định đơn chưa hoàn thành.
 * @param {Object} row
 * @returns {boolean}
 * @private
 */
function _isOrderUnfinished_(row) {
  const status = String(row["Status"] || "").trim();
  return status !== ORDER_STATUS.COMPLETED && status !== "Hoan tat";
}

/**
 * Xác định đơn ở trạng thái Lên kế hoạch.
 * @param {Object} row
 * @returns {boolean}
 * @private
 */
function _isOrderPlanned_(row) {
  return String(row["Status"] || "").trim() === ORDER_STATUS.PLANNED;
}

/**
 * Lấy giá trị TMS_Order ID từ 1 dòng OMS, tương thích nhiều biến thể header.
 * @param {Object} row
 * @returns {string}
 * @private
 */
function _getOmsTmsOrderIdFromRow_(row) {
  if (!row) return "";
  const keys = ["TMS_Order ID", "TMS_ORDER ID", "TMS ORDER ID"];
  for (let i = 0; i < keys.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(row, keys[i])) continue;
    const v = row[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

/**
 * Kiểm tra dòng OMS đã có TMS ID hay chưa.
 * @param {Object} row
 * @returns {boolean}
 * @private
 */
function _hasTmsOrderId_(row) {
  return !!_getOmsTmsOrderIdFromRow_(row);
}

/**
 * Đảm bảo sheet OMS có cột TMS_Order ID; nếu thiếu thì tự thêm ở cuối.
 * @returns {number} index cột (1-based)
 * @private
 */
function _ensureOmsTmsOrderIdColumn_() {
  const sheet = getSheet_("OMS");
  let headers = getSheetHeaders_("OMS");
  let tmsCol = headers.indexOf("TMS_Order ID") + 1;
  if (tmsCol > 0) return tmsCol;

  const lastCol = sheet.getLastColumn();
  tmsCol = lastCol + 1;
  sheet.insertColumnAfter(lastCol);
  sheet.getRange(1, tmsCol).setValue("TMS_Order ID");
  SpreadsheetApp.flush();

  headers = getSheetHeaders_("OMS");
  const recheck = headers.indexOf("TMS_Order ID") + 1;
  if (recheck <= 0) {
    throw new Error(
      'SHEET_SCHEMA_MISSING::Không thể tự tạo cột "TMS_Order ID" trên sheet OMS.',
    );
  }
  return recheck;
}
