/**
 * =============================================================================
 * FILE: ApiResponse.gs
 * PURPOSE: Chuẩn hoá format response trả về từ mọi server function cho
 *          google.script.run — luôn có { success, message, data } hoặc
 *          { success, error }, để FE (common.js) xử lý thống nhất 1 chỗ.
 * AUTHOR: (placeholder)
 * DEPENDENCIES: Không có
 * =============================================================================
 */

/**
 * Tạo response thành công.
 *
 * @param {*} data - Dữ liệu trả về (object/array/primitive).
 * @param {string} [message=''] - Thông báo kèm theo (hiển thị toast).
 * @returns {{success:boolean, message:string, data:*}}
 * @example
 * return success_(orderList, 'Đã tải danh sách đơn hàng');
 */
function success_(data, message) {
  return {
    success: true,
    message: message || '',
    data: (data === undefined) ? null : sanitizeForClient_(data)
  };
}

/**
 * Convert server-side values to google.script.run-safe JSON values.
 * Date objects are converted to ISO strings to avoid null response payloads.
 *
 * @param {*} value
 * @returns {*}
 */
function sanitizeForClient_(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();

  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(function (item) { return sanitizeForClient_(item); });
  }

  if (valueType === 'object') {
    const out = {};
    Object.keys(value).forEach(function (key) {
      out[key] = sanitizeForClient_(value[key]);
    });
    return out;
  }

  // Fallback for function/symbol/unknown host objects.
  return String(value);
}

/**
 * Tạo response lỗi. LUÔN dùng hàm này khi throw/catch lỗi ở tầng Service
 * trước khi trả về FE — không để lộ raw Error object của Apps Script
 * (chứa stack trace nội bộ) ra ngoài UI.
 *
 * Hỗ trợ convention "CODE::message" trong message lỗi (dùng bởi
 * Validation.gs và các Service) — tự động tách thành errorCode + error
 * message sạch, để FE (common.js) có thể switch theo errorCode mà không
 * cần parse chuỗi. Nếu truyền errorCode tường minh ở tham số thứ 2, nó
 * được ưu tiên hơn phần tách tự động.
 *
 * @param {string|Error} error - Message lỗi (có thể có prefix "CODE::")
 *        hoặc đối tượng Error.
 * @param {string} [errorCode] - Mã lỗi tường minh, ghi đè phần tự tách.
 * @returns {{success:boolean, error:string, errorCode:(string|undefined)}}
 * @example
 * try {
 *   throw new Error('DUPLICATE_KEY::Tenant_id đã tồn tại.');
 * } catch (e) {
 *   return error_(e); // { success:false, error:'Tenant_id đã tồn tại.', errorCode:'DUPLICATE_KEY' }
 * }
 * @example
 * try {
 *   ...
 * } catch (e) {
 *   Logger_.logError('OMSService.createOrder', e);
 *   return error_(e, 'CREATE_ORDER_FAILED');
 * }
 */
function error_(error, errorCode) {
  let message = (error instanceof Error) ? error.message : String(error);
  let code = errorCode;

  const sepIdx = message.indexOf('::');
  if (!code && sepIdx !== -1 && sepIdx < 40) { // 40 = giới hạn an toàn độ dài mã code
    code = message.substring(0, sepIdx);
    message = message.substring(sepIdx + 2);
  }

  const response = { success: false, error: message };
  if (code) {
    response.errorCode = code;
  }
  return response;
}