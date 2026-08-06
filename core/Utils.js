/**
 * =============================================================================
 * FILE: Utils.gs
 * PURPOSE: Hàm tiện ích dùng chung cho mọi Service — đọc sheet theo đúng
 *          header/dataStartRow (xử lý riêng Feed_Standard 2-header-row và
 *          FMS spill-anchor row 2), ghi dòng mới vào sheet có công thức
 *          copy-per-row (giải quyết TD-11), chuẩn hoá Tenant_id (TD-04).
 * AUTHOR: (placeholder)
 * DEPENDENCIES: Config.gs (getSheet_, getSheetLayout_)
 * REFERENCE: Japfa_Technical_Reference.md §4, §6 (F1-F13), TD-04, TD-11
 * =============================================================================
 */

/**
 * Đọc toàn bộ dữ liệu của 1 sheet theo đúng layout (header/data row) định
 * nghĩa trong Config.gs, trả về mảng object { tenCot: giaTri, ... }.
 * Tự động bỏ qua dòng trống hoàn toàn (tránh dòng rác cuối sheet).
 * Mỗi object có thêm field `__row` = số dòng thật trên sheet (1-based),
 * dùng để update lại đúng dòng khi cần (VD updateOrderStatus).
 *
 * ⚠️ Với FEED_STANDARD: đọc header ở row 2 (không phải row 1) — do Config.gs
 *    SHEET_LAYOUT.FEED_STANDARD.headerRow = 2.
 * ⚠️ Với FMS: bỏ qua row 2 (spill-anchor "blank_row") vì dataStartRow = 3.
 *
 * @param {string} sheetKey - Key trong SHEET_NAMES/SHEET_LAYOUT, VD 'FMS'.
 * @returns {Object[]} Mảng object dữ liệu, rỗng nếu sheet chưa có data.
 * @example
 * const configRows = getSheetData_('CONFIG');
 * // configRows[0] = { Tenant_id: 'WMS_01', Tenant: 'WMS_0', ... , __row: 2 }
 */
function getSheetData_(sheetKey) {
  const sheet = getSheet_(sheetKey);
  const layout = getSheetLayout_(sheetKey);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < layout.dataStartRow || lastCol === 0) {
    return [];
  }

  const headers = sheet
    .getRange(layout.headerRow, 1, 1, lastCol)
    .getValues()[0];
  const numDataRows = lastRow - layout.dataStartRow + 1;
  const values = sheet
    .getRange(layout.dataStartRow, 1, numDataRows, lastCol)
    .getValues();

  const rows = [];
  for (let i = 0; i < values.length; i++) {
    const rowArr = values[i];
    const isBlank = rowArr.every(function (v) {
      return v === "" || v === null || v === undefined;
    });
    if (isBlank) continue;

    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const key = String(headers[c]).trim();
      if (!key) continue; // cột trống tên (VD COL_15..30 nếu header cũng trống) — bỏ qua
      obj[key] = rowArr[c];
    }
    obj.__row = layout.dataStartRow + i;
    rows.push(obj);
  }
  return rows;
}

/**
 * Đọc header thật (row đúng theo layout) của 1 sheet — dùng khi cần biết
 * thứ tự cột để ghi dòng mới đúng vị trí (VD appendRowWithFormula_).
 *
 * @param {string} sheetKey
 * @returns {string[]} Mảng tên cột theo đúng thứ tự trái→phải.
 * @example
 * getSheetHeaders_('FEED_STANDARD'); // ['Loại Gà','Ngày Tuổi','TĂ sử dụng (g/c/n)', ...]
 */
function getSheetHeaders_(sheetKey) {
  const sheet = getSheet_(sheetKey);
  const layout = getSheetLayout_(sheetKey);
  const lastCol = sheet.getLastColumn();
  return sheet
    .getRange(layout.headerRow, 1, 1, lastCol)
    .getValues()[0]
    .map(function (h) {
      return String(h).trim();
    });
}

/**
 * Ghi 1 dòng mới vào sheet có công thức copy-per-row (Product_Master,
 * WMS_factory, WMS_farm) — giải quyết TD-11: các công thức này KHÔNG tự
 * giãn khi thêm dòng, phải copy thủ công từ dòng liền trước.
 *
 * Cách hoạt động:
 * 1. Ghi giá trị cho các cột KHÔNG phải công thức (theo rowValues).
 * 2. Copy công thức (Range.copyTo, giữ nguyên relative reference) từ dòng
 *    cuối cùng đang có dữ liệu xuống dòng mới, chỉ áp dụng cho các cột
 *    trong formulaColIndexes.
 * 3. flush() để Google Sheets tính toán ngay lập tức.
 * 4. Đọc lại toàn bộ dòng (giá trị đã tính) để trả về cho service gọi.
 *
 * @param {string} sheetKey - VD 'PRODUCT_MASTER', 'WMS_FACTORY', 'WMS_FARM'.
 * @param {Array<*>} rowValues - Mảng giá trị theo đúng thứ tự cột trên sheet;
 *        phần tử tại vị trí cột công thức có thể để `null` (sẽ bị ghi đè bởi copyTo).
 * @param {number[]} formulaColIndexes - Mảng số cột (1-based) chứa công thức
 *        cần copy-per-row. VD Product_Master: cột A(1)=SKU, F(6)=stock_age_min,
 *        G(7)=stock_age_max, H(8)=Mô tả → [1,6,7,8].
 * @returns {{rowNumber:number, values:Array<*>}} Số dòng mới và giá trị đã tính.
 * @throws {Error} Nếu sheet chưa có dòng dữ liệu mẫu nào để copy công thức từ đó.
 * @example
 * // Product_Master: A=SKU(formula), B=Tên hàng hóa, C=Loại sp, D=UOM,
 * // E=UOM_weight_kg, F=stock_age_min(formula), G=stock_age_max(formula),
 * // H=Mô tả(formula), I=Status
 * const result = appendRowWithFormula_('PRODUCT_MASTER',
 *   [null, 'C05S+', 'Chicken_feed', 'Bag', 40, null, null, null, 'ACTIVE'],
 *   [1, 6, 7, 8]);
 * // result.values[0] === 'C05S+_Bag_40' (SKU đã được công thức tính ra)
 */
function appendRowWithFormula_(sheetKey, rowValues, formulaColIndexes) {
  const sheet = getSheet_(sheetKey);
  const layout = getSheetLayout_(sheetKey);
  const lastRow = sheet.getLastRow();
  const newRow = lastRow + 1;
  const numCols = rowValues.length;

  if (lastRow < layout.dataStartRow) {
    throw new Error(
      'Utils.gs: Sheet "' +
        SHEET_NAMES[sheetKey] +
        '" chưa có dòng dữ liệu mẫu nào ' +
        "để copy công thức. Cần ít nhất 1 dòng có sẵn công thức trước khi dùng appendRowWithFormula_().",
    );
  }

  // Bước 1: ghi giá trị cho cột KHÔNG phải công thức
  for (let c = 1; c <= numCols; c++) {
    if (formulaColIndexes.indexOf(c) === -1) {
      sheet.getRange(newRow, c).setValue(rowValues[c - 1]);
    }
  }

  // Bước 2: copy công thức từ dòng cuối cùng xuống dòng mới (giữ relative ref)
  formulaColIndexes.forEach(function (c) {
    const srcCell = sheet.getRange(lastRow, c);
    const destCell = sheet.getRange(newRow, c);
    srcCell.copyTo(destCell, { contentsOnly: false });
  });

  // Bước 3: ép Google Sheets tính lại ngay để đọc được giá trị thật
  SpreadsheetApp.flush();

  // Bước 4: đọc lại toàn bộ dòng (giá trị đã tính, không phải công thức thô)
  const resultValues = sheet.getRange(newRow, 1, 1, numCols).getValues()[0];

  return { rowNumber: newRow, values: resultValues };
}

/**
 * Cập nhật giá trị 1 hoặc nhiều cột trên 1 dòng đã tồn tại (không đụng tới
 * các cột công thức). Dùng cho các thao tác update đơn giản như
 * updateOrderStatus().
 *
 * @param {string} sheetKey
 * @param {number} rowNumber - Số dòng thật trên sheet (lấy từ field `__row`
 *        của object trả về bởi getSheetData_).
 * @param {Object<number,*>} colValueMap - Map { soCot(1-based): giaTriMoi }.
 * @returns {void}
 * @example
 * updateRowCells_('OMS', 5, { 13: 'Hoan tat', 12: new Date() });
 * // cột 13 = Status, cột 12 = Ngày giao hàng (Thực tế)
 */
function updateRowCells_(sheetKey, rowNumber, colValueMap) {
  const sheet = getSheet_(sheetKey);
  Object.keys(colValueMap).forEach(function (colStr) {
    const col = parseInt(colStr, 10);
    sheet.getRange(rowNumber, col).setValue(colValueMap[colStr]);
  });
}

/**
 * Chuẩn hoá Tenant_id để so khớp giữa các sheet có format khác nhau
 * (TD-04 — bằng chứng thật: WMS_factory dùng "WMS_01", WMS_farm/OMS dùng
 * "WMS_1"). Hàm này KHÔNG sửa dữ liệu gốc trên sheet, chỉ dùng ở tầng
 * so sánh trong code (join, filter, group).
 *
 * Quy tắc: tách phần chữ đứng đầu + phần số, bỏ số 0 ở đầu phần số.
 * "WMS_01" → "WMS_1" ; "WMS_1" → "WMS_1" ; "WMS_001" → "WMS_1".
 * Nếu không khớp pattern chữ+số, trả nguyên chuỗi gốc đã trim.
 *
 * @param {string} tenantId - Tenant_id thô đọc từ sheet.
 * @returns {string} Tenant_id đã chuẩn hoá, dùng để so sánh (===).
 * @example
 * normalizeTenantId_('WMS_01') === normalizeTenantId_('WMS_1'); // true
 */
function normalizeTenantId_(tenantId) {
  if (tenantId === null || tenantId === undefined || tenantId === "")
    return tenantId;
  const str = String(tenantId).trim();
  const match = str.match(/^([A-Za-z]+)_?0*(\d+)$/);
  if (match) {
    return match[1] + "_" + match[2];
  }
  return str;
}

/**
 * So sánh 2 Tenant_id có "cùng ý nghĩa" hay không, đã qua chuẩn hoá TD-04.
 *
 * @param {string} tenantIdA
 * @param {string} tenantIdB
 * @returns {boolean}
 * @example
 * tenantIdEquals_('WMS_01', 'WMS_1'); // true
 */
function tenantIdEquals_(tenantIdA, tenantIdB) {
  return normalizeTenantId_(tenantIdA) === normalizeTenantId_(tenantIdB);
}

/**
 * Chuẩn hoá SKU dạng text để so sánh an toàn (trim + upper-case).
 * @param {string} sku
 * @returns {string}
 */
function normalizeSku_(sku) {
  if (sku === null || sku === undefined) return "";
  return String(sku).trim().toUpperCase();
}

/**
 * So khớp SKU theo 2 dạng:
 * - Dạng đầy đủ: C01S+_Bag_40
 * - Dạng ngắn legacy: C01S+
 *
 * Hàm này không sửa dữ liệu gốc, chỉ dùng để so sánh trong giai đoạn migrate.
 * @param {string} skuA
 * @param {string} skuB
 * @returns {boolean}
 */
function skuEquals_(skuA, skuB) {
  const a = normalizeSku_(skuA);
  const b = normalizeSku_(skuB);
  if (!a || !b) return false;
  if (a === b) return true;

  const aShort = a.split("_")[0];
  const bShort = b.split("_")[0];
  return aShort === bShort;
}

/**
 * Format 1 giá trị Date theo timezone chuẩn hệ thống (Asia/Saigon),
 * dùng khi trả dữ liệu ra UI (tránh lệch ngày do timezone browser).
 *
 * @param {Date|string} dateValue
 * @param {string} [pattern='dd/MM/yyyy'] - Pattern theo Utilities.formatDate.
 * @returns {string} Chuỗi ngày đã format, hoặc '' nếu dateValue rỗng/không hợp lệ.
 * @example
 * formatDate_(new Date('2026-07-09')); // '09/07/2026'
 */
function formatDate_(dateValue, pattern) {
  if (!dateValue) return "";
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(d.getTime())) return "";
  return Utilities.formatDate(d, APP_TIMEZONE, pattern || "dd/MM/yyyy");
}

/**
 * Lấy ngày hôm nay (00:00:00) theo timezone hệ thống — dùng để so sánh
 * ngày mà không bị lệch giờ.
 *
 * @returns {Date}
 * @example
 * const today = getTodayInTZ_();
 */
function getTodayInTZ_() {
  const now = new Date();
  const todayStr = Utilities.formatDate(now, APP_TIMEZONE, "yyyy-MM-dd");
  return new Date(todayStr + "T00:00:00");
}

/**
 * Lọc mảng object theo bộ filter đơn giản (equality/contains), dùng chung
 * cho các hàm read*(filters) — VD readFMS, getOrderList, readFarmInventory.
 * - Nếu filter value là undefined/null/'' → bỏ qua điều kiện đó.
 * - So sánh chuỗi: case-insensitive, dùng "chứa" (contains) để hỗ trợ search.
 * - So sánh ngày: filters.dateFrom/dateTo (nếu field tương ứng truyền vào).
 *
 * @param {Object[]} rows - Dữ liệu đọc từ getSheetData_().
 * @param {Object<string,*>} filters - Map { tenCotSheet: giaTriCanLoc }.
 * @returns {Object[]} Dữ liệu đã lọc.
 * @example
 * filterRows_(fmsRows, { 'FLOCK_ID': 'CKMN0545/0004', 'FEED state': 'Actual' });
 */
function filterRows_(rows, filters) {
  if (!filters) return rows;
  const keys = Object.keys(filters).filter(function (k) {
    const v = filters[k];
    return v !== undefined && v !== null && v !== "";
  });
  if (keys.length === 0) return rows;

  return rows.filter(function (row) {
    return keys.every(function (k) {
      const filterVal = filters[k];
      const rowVal = row[k];
      if (rowVal === undefined || rowVal === null) return false;
      if (typeof filterVal === "string") {
        return (
          String(rowVal).toLowerCase().indexOf(filterVal.toLowerCase()) !== -1
        );
      }
      return rowVal === filterVal;
    });
  });
}

/**
 * Lấy email user hiện tại đang truy cập Web App.
 * Dùng cho field "Updated by" (Config/Product_Master/...) và audit log.
 *
 * @returns {string} Email, hoặc 'unknown' nếu không lấy được (VD deploy sai
 *          quyền "Execute as").
 * @example
 * const email = getCurrentUserEmail_();
 */
function getCurrentUserEmail_() {
  try {
    const email = Session.getActiveUser().getEmail();
    return email || "unknown";
  } catch (e) {
    return "unknown";
  }
}

/**
 * Sinh khoá composite dùng để so khớp bản ghi theo nhiều field
 * (VD khoá chính Feed_Standard = [Loại Gà + Ngày Tuổi]).
 *
 * @param {...*} parts - Các phần của khoá.
 * @returns {string}
 * @example
 * compositeKey_('ChoiNoi_Male_GiaLai', 1); // 'ChoiNoi_Male_GiaLai||1'
 */
function compositeKey_() {
  const parts = Array.prototype.slice.call(arguments);
  return parts
    .map(function (p) {
      return String(p).trim();
    })
    .join("||");
}
