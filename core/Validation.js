/**
 * =============================================================================
 * FILE: Validation.gs
 * PURPOSE: Validate input server-side dùng chung — bắt buộc chạy TRƯỚC khi
 *          ghi dữ liệu, không tin tưởng validate phía client (có thể bị
 *          bypass qua console/devtools).
 * AUTHOR: (placeholder)
 * DEPENDENCIES: Utils.gs (tenantIdEquals_)
 * REFERENCE: Japfa_PRD.md §3.4 (validate tạo Order), §3.5 (Adjustment),
 *            §3.6 (Setup — không cho trùng khoá chính)
 * =============================================================================
 */

const Validation_ = {

  /**
   * Ném lỗi nếu field rỗng/undefined/null.
   * @param {*} value
   * @param {string} fieldName - Tên field hiển thị trong message lỗi.
   * @throws {Error}
   * @example
   * Validation_.requireField(payload.Tenant_id, 'Tenant_id');
   */
  requireField: function (value, fieldName) {
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new Error('Trường "' + fieldName + '" là bắt buộc, không được để trống.');
    }
  },

  /**
   * Validate nhiều field bắt buộc cùng lúc.
   * @param {Object} payload
   * @param {string[]} fieldNames
   * @throws {Error}
   * @example
   * Validation_.requireFields(payload, ['SYSTEM', 'Tenant', 'Tenant_id']);
   */
  requireFields: function (payload, fieldNames) {
    fieldNames.forEach(function (f) {
      Validation_.requireField(payload[f], f);
    });
  },

  /**
   * Validate số phải > 0. Dùng cho Số lượng Order, In/Out qtty...
   * @param {*} value
   * @param {string} fieldName
   * @throws {Error}
   * @example
   * Validation_.requirePositiveNumber(payload['Số lượng'], 'Số lượng');
   */
  requirePositiveNumber: function (value, fieldName) {
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      throw new Error('Trường "' + fieldName + '" phải là số lớn hơn 0.');
    }
  },

  /**
   * Validate 2 giá trị Tenant/địa điểm không được trùng nhau — dùng cho
   * "Nơi đi ≠ Nơi đến" khi tạo Order (PRD §3.4).
   * @param {string} from
   * @param {string} to
   * @param {string} [message]
   * @throws {Error}
   * @example
   * Validation_.requireDifferent(payload['Nơi đi'], payload['Nơi đến'], 'Nơi đi và Nơi đến không được trùng nhau.');
   */
  requireDifferent: function (from, to, message) {
    if (String(from).trim() === String(to).trim()) {
      throw new Error(message || 'Hai giá trị không được trùng nhau: "' + from + '".');
    }
  },

  /**
   * Validate không cho tạo trùng khoá chính khi INSERT mới (không phải update).
   * Dùng trong SetupService trước khi upsert — nếu tìm thấy khoá đã tồn tại
   * và payload không có cờ `__confirmUpdate`, ném lỗi để FE hỏi xác nhận
   * "cập nhật dòng đã có?" (đúng AC PRD §3.6).
   *
   * @param {Object[]} existingRows - Dữ liệu hiện có (từ getSheetData_).
   * @param {string} keyField - Tên field làm khoá chính, VD 'Tenant_id'.
   * @param {string} newKeyValue - Giá trị khoá của dòng đang định ghi.
   * @param {boolean} confirmUpdate - true nếu FE đã xác nhận muốn update.
   * @returns {Object|null} Dòng đã tồn tại (nếu có), null nếu là khoá mới.
   * @throws {Error} Nếu khoá đã tồn tại nhưng confirmUpdate=false.
   * @example
   * const existing = Validation_.checkDuplicateKey(configRows, 'Tenant_id', 'WMS_01', payload.__confirmUpdate);
   */
  checkDuplicateKey: function (existingRows, keyField, newKeyValue, confirmUpdate) {
    const found = existingRows.find(function (r) {
      return String(r[keyField]).trim() === String(newKeyValue).trim();
    });
    if (found && !confirmUpdate) {
      throw new Error('DUPLICATE_KEY::Khoá "' + newKeyValue + '" đã tồn tại. ' +
        'Xác nhận nếu bạn muốn CẬP NHẬT dòng đã có thay vì tạo mới.');
    }
    return found || null;
  },

  /**
   * Validate không cho tạo trùng khoá composite (VD Feed_Standard:
   * [Loại Gà + Ngày Tuổi]).
   *
   * @param {Object[]} existingRows
   * @param {string[]} keyFields - VD ['Loại Gà', 'Ngày Tuổi'].
   * @param {Object} payload
   * @param {boolean} confirmUpdate
   * @returns {Object|null}
   * @throws {Error}
   * @example
   * Validation_.checkDuplicateCompositeKey(feedStdRows, ['Loại Gà','Ngày Tuổi'], payload, payload.__confirmUpdate);
   */
  checkDuplicateCompositeKey: function (existingRows, keyFields, payload, confirmUpdate) {
    const newKey = compositeKey_.apply(null, keyFields.map(function (f) { return payload[f]; }));
    const found = existingRows.find(function (r) {
      const rowKey = compositeKey_.apply(null, keyFields.map(function (f) { return r[f]; }));
      return rowKey === newKey;
    });
    if (found && !confirmUpdate) {
      throw new Error('DUPLICATE_KEY::Khoá [' + keyFields.join(' + ') + '] = [' +
        keyFields.map(function (f) { return payload[f]; }).join(' + ') +
        '] đã tồn tại. Xác nhận nếu bạn muốn CẬP NHẬT.');
    }
    return found || null;
  }
};