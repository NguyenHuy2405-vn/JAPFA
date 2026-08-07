/**
 * =============================================================================
 * FILE: WMSService.gs
 * PURPOSE: Ghi giao dịch tồn kho THỦ CÔNG (không qua Order) — Adjustment
 *          (điều chỉnh theo kiểm kê) và Inbound/Outbound (nhập/xuất tay,
 *          bao gồm cả thiết lập tồn đầu kỳ cho Flock/SKU mới — PRD §3.7).
 *          Đọc lịch sử giao dịch cũng nằm ở đây (getWmsTransactionHistory).
 *
 * ⚠️ getInventoryStatus()/getFactoryInventoryStatus()/getFarmInventoryStatus()
 *    ĐÃ có sẵn trong InventoryService.gs — KHÔNG viết lại ở đây dù REF-5 (TR)
 *    ghi nhóm này thuộc "WMSService"; đó chỉ là khác tên file, chức năng đã
 *    tồn tại và đã đúng theo TD-14 (đọc thẳng ledger, không qua
 *    Stock_Balance_Factory/Farm vì 2 sheet đó không tồn tại thật).
 *
 * QUY TẮC GHI LEDGER (TR F11/F12 — copy-per-row, KHÔNG phải array formula):
 * - WMS_factory: cột F(6)=Tồn đầu kỳ, I(9)=Tồn cuối kỳ là công thức.
 * - WMS_farm   : cột C(3)=DATE, I(9)=Begin_qtty, L(12)=End_qtty,
 *                M(13)=End_qtty_order là công thức.
 * → Mọi lần ghi dòng mới PHẢI qua appendRowWithFormula_() (Utils.gs) để
 *   copy đúng công thức từ dòng liền trước, tự tính tồn đầu/cuối kỳ.
 *
 * AUTHOR: (placeholder)
 * DEPENDENCIES: Utils.gs, Validation.gs, Auth.gs, ApiResponse.gs, Logger.gs,
 *               Constants.gs, InventoryService.gs (getCurrentStock_)
 * REFERENCE: Japfa_PRD.md §3.5, §3.7 · Technical Reference F11, F12, REF-5,
 *            §5 S5 · Japfa_Function_Flows.md §3, §4
 * =============================================================================
 */

/**
 * Đọc lịch sử giao dịch tồn kho (factory hoặc farm), có filter.
 * Dữ liệu thô — không tính lại tồn kho hiện tại (đã tính sẵn theo dòng qua
 * công thức F11/F12, xem cột `Tồn kho cuối kỳ`/`End_qtty`).
 *
 * @param {'factory'|'farm'} scope
 * @param {Object} [filters] - VD { SKU:'C01S+', 'Loại giao dịch':'Adjustment' }.
 * @returns {{success:boolean, data:Object[]}}
 * @example
 * getWmsTransactionHistory('farm', { Tenant_id: 'WMS_1' });
 */
function getWmsTransactionHistory(scope, filters) {
  try {
    const sheetKey = _resolveWmsSheetKey_(scope);
    const rows = getSheetData_(sheetKey).sort(function (a, b) {
      return b.__row - a.__row;
    }); // mới nhất trước
    return success_(filterRows_(rows, filters));
  } catch (e) {
    Logger_.logError("WMSService.getWmsTransactionHistory", e);
    return error_(e, "GET_WMS_HISTORY_FAILED");
  }
}

/**
 * Ghi nhận Adjustment (điều chỉnh tồn kho theo kiểm kê thực tế) — PRD §3.5.
 * LUÔN bắt buộc `Lý do` (1 trong `ADJUSTMENT_REASONS`, Constants.gs).
 * Không gắn `Order ID`.
 *
 * ⚠️ GIẢ ĐỊNH cần xác nhận (PRD không nói rõ): Adjustment kiểm kê phản ánh
 * số liệu THỰC TẾ nên được phép đưa tồn kho xuống thấp hơn hệ thống đang
 * ghi nhận — vì vậy hàm này KHÔNG chặn cứng theo `checkStockAvailable_`
 * (khác với Outbound/Order — xem `submitInboundOutbound`). Nếu cần chặn,
 * đổi `allowNegative` bên dưới.
 *
 * @param {Object} payload
 * @param {'factory'|'farm'} payload.scope
 * @param {string} payload.Tenant_id
 * @param {string} payload.SKU
 * @param {number} payload.deltaQty - Chênh lệch (dương = tăng, âm = giảm), khác 0.
 * @param {string} payload.reason - Phải thuộc `ADJUSTMENT_REASONS`.
 * @param {string} [payload.FLOCK_ID] - Chỉ áp dụng scope='farm'.
 * @param {number} [payload['Ngày Tuổi']] - Chỉ áp dụng scope='farm'.
 * @param {string} [payload.note]
 * @param {string} [payload.DATE] - ISO date; mặc định hôm nay.
 * @returns {{success:boolean, data:Object, message:string}}
 * @example
 * submitAdjustment({ scope:'farm', Tenant_id:'WMS_1', SKU:'C01S+', deltaQty:-50,
 *   reason:'Kiểm kê định kỳ', FLOCK_ID:'CKMN0545/0004' });
 */
function submitAdjustment(payload) {
  try {
    requirePermission_("wms.adjustment.write");
    Validation_.requireFields(payload, [
      "scope",
      "Tenant_id",
      "SKU",
      "deltaQty",
      "reason",
    ]);
    if (ADJUSTMENT_REASONS.indexOf(payload.reason) === -1) {
      throw new Error(
        'INVALID_REASON::Lý do điều chỉnh không hợp lệ: "' +
          payload.reason +
          '".',
      );
    }
    const delta = Number(payload.deltaQty);
    if (isNaN(delta) || delta === 0) {
      throw new Error('Trường "deltaQty" phải là số khác 0.');
    }

    const txnType =
      payload.scope === "factory"
        ? WMS_FACTORY_TXN_TYPE.ADJUSTMENT
        : WMS_FARM_TXN_TYPE.ADJUSTMENT;
    const inQty = delta > 0 ? delta : 0;
    const outQty = delta < 0 ? Math.abs(delta) : 0;

    const result = _appendWmsTransaction_(payload.scope, {
      Tenant_id: payload.Tenant_id,
      DATE: payload.DATE,
      SKU: payload.SKU,
      txnType: txnType,
      inQty: inQty,
      outQty: outQty,
      orderId: "", // Adjustment không gắn Order ID
      FLOCK_ID: payload.FLOCK_ID,
      NgayTuoi: payload["Ngày Tuổi"],
      note:
        (payload.note ? payload.note + " | " : "") + "Lý do: " + payload.reason,
    });

    Logger_.logAudit(
      "WMSService.submitAdjustment",
      "Adjustment " +
        payload.scope +
        " Tenant_id=" +
        payload.Tenant_id +
        " SKU=" +
        payload.SKU +
        " delta=" +
        delta +
        " lý do=" +
        payload.reason,
    );
    return success_(result, "Đã ghi nhận điều chỉnh tồn kho.");
  } catch (e) {
    Logger_.logError("WMSService.submitAdjustment", e);
    return error_(e, "SUBMIT_ADJUSTMENT_FAILED");
  }
}

/**
 * Ghi nhận Inbound/Outbound THỦ CÔNG (không qua Order) — PRD §3.5.
 * Dùng chung cho:
 * - Nhập hàng từ NCC ngoài vào nhà máy (Inbound, scope='factory').
 * - Xuất/nhập tay ở farm không qua Order.
 * - **Thiết lập tồn đầu kỳ cho Flock/SKU mới** (PRD §3.7): gọi với
 *   `type='Inbound'`, không truyền `orderId`, `qty` = tồn đầu kỳ thật —
 *   vì đây là dòng ĐẦU TIÊN của SKU/Flock đó nên công thức F11/F12 tự
 *   tính `Tồn đầu kỳ`/`Begin_qtty` = 0 (không tìm thấy dòng trước).
 *
 * Chặn cứng nếu Outbound vượt quá tồn kho hiện có (PRD §3.4 áp dụng
 * tương tự cho Outbound thủ công, không riêng Order — theo nguyên tắc
 * "không cho tồn kho âm ngoài ý muốn" nêu ở §3.4; nếu chỉ muốn cảnh báo
 * thay vì chặn, cần Phúc xác nhận lại).
 *
 * @param {Object} payload
 * @param {'factory'|'farm'} payload.scope
 * @param {'Inbound'|'Outbound'} payload.type
 * @param {string} payload.Tenant_id
 * @param {string} payload.SKU
 * @param {number} payload.qty - Số lượng, phải > 0.
 * @param {string} [payload.orderId] - Chỉ dùng khi được gọi nội bộ từ
 *        `OMSService.createOrder()`; nhập tay qua UI thì để trống.
 * @param {string} [payload.FLOCK_ID] - Chỉ áp dụng scope='farm'.
 * @param {number} [payload['Ngày Tuổi']] - Chỉ áp dụng scope='farm'.
 * @param {string} [payload.note]
 * @param {string} [payload.DATE] - ISO date; mặc định hôm nay.
 * @returns {{success:boolean, data:Object, message:string}}
 * @example
 * // Thiết lập tồn đầu kỳ Flock mới (PRD §3.7)
 * submitInboundOutbound({ scope:'farm', type:'Inbound', Tenant_id:'WMS_1',
 *   SKU:'C01S+_Bag_40', qty:5400, FLOCK_ID:'CKMN0545/0005' });
 */
function submitInboundOutbound(payload) {
  try {
    requirePermission_("wms.inboundOutbound.write");
    Validation_.requireFields(payload, [
      "scope",
      "type",
      "Tenant_id",
      "SKU",
      "qty",
    ]);
    Validation_.requirePositiveNumber(payload.qty, "qty");

    const ledgerSku = resolveLedgerSkuKey_(
      payload.scope,
      payload.Tenant_id,
      payload.SKU,
    );

    const txnTypeMap =
      payload.scope === "factory" ? WMS_FACTORY_TXN_TYPE : WMS_FARM_TXN_TYPE;
    const txnType = txnTypeMap[String(payload.type).toUpperCase()];
    if (
      !txnType ||
      (payload.scope === "factory" && payload.type === "Consume")
    ) {
      throw new Error(
        'INVALID_TXN_TYPE::Loại giao dịch không hợp lệ cho scope "' +
          payload.scope +
          '": "' +
          payload.type +
          '".',
      );
    }

    const qty = Number(payload.qty);
    const isOutbound =
      txnType === WMS_FARM_TXN_TYPE.OUTBOUND ||
      txnType === WMS_FACTORY_TXN_TYPE.OUTBOUND;

    if (isOutbound) {
      const current = getCurrentStock_(
        payload.scope,
        payload.Tenant_id,
        ledgerSku,
      );
      if (current < qty) {
        throw new Error(
          "INSUFFICIENT_STOCK::Tồn kho hiện tại (" +
            current +
            ") không đủ để xuất " +
            qty +
            ".",
        );
      }
    }

    const result = _appendWmsTransaction_(payload.scope, {
      Tenant_id: payload.Tenant_id,
      DATE: payload.DATE,
      SKU: ledgerSku,
      txnType: txnType,
      inQty: isOutbound ? 0 : qty,
      outQty: isOutbound ? qty : 0,
      orderId: payload.orderId || "",
      FLOCK_ID: payload.FLOCK_ID,
      NgayTuoi: payload["Ngày Tuổi"],
      note: payload.note || "",
    });

    Logger_.logAudit(
      "WMSService.submitInboundOutbound",
      txnType +
        " " +
        payload.scope +
        " Tenant_id=" +
        payload.Tenant_id +
        " SKU=" +
        payload.SKU +
        " qty=" +
        qty,
    );
    return success_(result, "Đã ghi nhận giao dịch " + txnType + ".");
  } catch (e) {
    Logger_.logError("WMSService.submitInboundOutbound", e);
    return error_(e, "SUBMIT_INBOUND_OUTBOUND_FAILED");
  }
}

/**
 * Kiểm tra tồn kho nguồn có đủ trước khi tạo Order/Outbound — dùng nội bộ
 * bởi `OMSService.createOrder()` (PRD §3.4 validation) và
 * `submitInboundOutbound()` ở trên.
 *
 * @param {'factory'|'farm'} scope
 * @param {string} tenantId
 * @param {string} sku
 * @param {number} qty - Số lượng cần trừ.
 * @returns {boolean} true nếu tồn kho hiện tại >= qty.
 * @example
 * if (!checkStockAvailable_('factory', 'WMS_01', 'C01S+_Bag_40', 5400)) { ... }
 */
function checkStockAvailable_(scope, tenantId, sku, qty) {
  const ledgerSku = resolveLedgerSkuKey_(scope, tenantId, sku);
  return getCurrentStock_(scope, tenantId, ledgerSku) >= Number(qty);
}

/**
 * Ghi 1 dòng giao dịch mới vào ledger đúng scope, dùng `appendRowWithFormula_`
 * để công thức F11 (factory)/F12 (farm) tự tính tồn đầu/cuối kỳ.
 *
 * @param {'factory'|'farm'} scope
 * @param {Object} txn - { Tenant_id, DATE, SKU, txnType, inQty, outQty,
 *        orderId, FLOCK_ID, NgayTuoi, note }
 * @returns {{rowNumber:number, values:Array<*>}}
 * @private
 */
function _appendWmsTransaction_(scope, txn) {
  const date = txn.DATE ? new Date(txn.DATE) : getTodayInTZ_();

  if (scope === "factory") {
    // Cột theo TR §4.6: A Tenant_id, B DATE, C Order ID, D SKU, E Loại giao dịch,
    // F Tồn đầu kỳ(formula), G Số lượng In, H Số lượng Out, I Tồn cuối kỳ(formula), J Note
    const rowValues = [
      txn.Tenant_id,
      date,
      txn.orderId || "",
      txn.SKU,
      txn.txnType,
      null,
      txn.inQty,
      txn.outQty,
      null,
      txn.note || "",
    ];
    return appendRowWithFormula_("WMS_FACTORY", rowValues, [6, 9]);
  }

  // scope === 'farm' — cột theo TR §4.7: A Tenant_id, B Transaction ID(bỏ trống),
  // C DATE(formula), D Date_input, E SKU, F Loại giao dịch, G FLOCK_ID,
  // H Ngày Tuổi, I Begin_qtty(formula), J In_qtty, K Out_qtty,
  // L End_qtty(formula), M End_qtty_order(formula), N Order ID
  const rowValues = [
    txn.Tenant_id,
    "",
    null,
    date,
    txn.SKU,
    txn.txnType,
    txn.FLOCK_ID || "",
    txn.NgayTuoi || "",
    null,
    txn.inQty,
    txn.outQty,
    null,
    null,
    txn.orderId || "",
  ];
  // Cột C (DATE) cũng là formula (tra FMS) nhưng ta đã truyền Date_input (D)
  // làm fallback đúng theo F12: "=...IF(D2<>"",D2,"")" — nên formula ở C vẫn
  // copy bình thường, chỉ cần D có giá trị để C fallback đúng khi FMS chưa
  // có dòng khớp FLOCK_ID+Ngày Tuổi tương ứng (VD giao dịch không gắn Flock).
  return appendRowWithFormula_("WMS_FARM", rowValues, [3, 9, 12, 13]);
}

/**
 * Map scope → sheetKey dùng bởi Config.gs (SHEET_NAMES/SHEET_LAYOUT).
 * @param {'factory'|'farm'} scope
 * @returns {string}
 * @throws {Error} Nếu scope không hợp lệ.
 * @private
 */
function _resolveWmsSheetKey_(scope) {
  if (scope === "factory") return "WMS_FACTORY";
  if (scope === "farm") return "WMS_FARM";
  throw new Error(
    'SCOPE tồn kho không hợp lệ: "' +
      scope +
      '" (chỉ nhận "factory" hoặc "farm").',
  );
}

/**
 * Tìm DATE giao dịch WMS_farm gần nhất < hôm nay theo flock.
 *
 * @param {string} flockId
 * @returns {Date|null}
 */
function _findLatestWmsFarmDateBeforeToday_(flockId) {
  const target = String(flockId || '').trim();
  if (!target) return null;

  const rows = getSheetData_('WMS_FARM').filter(function (r) {
    return String(r['FLOCK_ID'] || '').trim() === target;
  });

  if (rows.length === 0) return null;

  const today = getTodayInTZ_();
  let latest = null;
  rows.forEach(function (r) {
    const d = new Date(r['DATE']);
    if (isNaN(d.getTime())) return;
    if (d < today && (!latest || d > latest)) {
      latest = d;
    }
  });

  return latest;
}
