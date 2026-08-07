/**
 * =============================================================================
 * FILE: Logger.gs
 * PURPOSE: Ghi log lỗi & audit trail cho toàn hệ thống. Dùng Console.error
 *          (xem trong Apps Script > Executions) làm nguồn chính; đồng thời
 *          ghi vào 1 sheet ẩn "_SystemLog" (tự tạo nếu chưa có) để không
 *          phụ thuộc hoàn toàn vào Execution log (vốn có giới hạn thời gian
 *          lưu trữ trên Apps Script).
 * AUTHOR: (placeholder)
 * DEPENDENCIES: Config.gs (getSpreadsheet_)
 * NOTE: Không dùng tên "Logger" trùng với class built-in Logger của Apps
 *       Script — mọi hàm export qua object Logger_ để tránh xung đột.
 * =============================================================================
 */

const Logger_ = {

  /**
   * Tên sheet log nội bộ — KHÔNG nằm trong SHEET_NAMES (Config.gs) vì đây
   * là sheet kỹ thuật, không thuộc data model nghiệp vụ (JAPFA_DB gốc).
   * @constant {string}
   */
  LOG_SHEET_NAME: '_SystemLog',

  /**
   * Lấy (hoặc tự tạo) sheet log nội bộ.
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   * @private
   */
  _getOrCreateLogSheet: function () {
    const ss = getSpreadsheet_();
    let sheet = ss.getSheetByName(this.LOG_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(this.LOG_SHEET_NAME);
      sheet.appendRow(['Timestamp', 'Level', 'Source', 'Message', 'User']);
      sheet.hideSheet();
    }
    return sheet;
  },

  /**
   * Ghi log lỗi — dùng trong mọi khối catch ở tầng Service.
   *
   * @param {string} source - Tên hàm/service phát sinh lỗi, VD 'OMSService.createOrder'.
   * @param {Error|string} err - Đối tượng lỗi hoặc message.
   * @returns {void}
   * @example
   * try { ... } catch (e) { Logger_.logError('WMSService.submitAdjustment', e); }
   */
  logError: function (source, err) {
    const message = (err instanceof Error) ? (err.message + ' | Stack: ' + err.stack) : String(err);
    console.error('[' + source + '] ' + message);
    this._appendLog('ERROR', source, message);
  },

  /**
   * Ghi log audit cho các thao tác ghi dữ liệu quan trọng (upsert/create/adjust),
   * phục vụ truy vết sau này (VD "ai đã sửa Policy_Thresholds lúc nào").
   *
   * @param {string} source - Tên hàm thực hiện, VD 'SetupService.upsertConfig'.
   * @param {string} message - Mô tả hành động, VD 'Upsert Config Tenant_id=WMS_01'.
   * @returns {void}
   * @example
   * Logger_.logAudit('OMSService.createOrder', 'Tạo Order ID=WMS_1-ORD-000005');
   */
  logAudit: function (source, message) {
    this._appendLog('AUDIT', source, message);
  },

  /**
   * @param {string} level
   * @param {string} source
   * @param {string} message
   * @private
   */
  _appendLog: function (level, source, message) {
    try {
      const sheet = this._getOrCreateLogSheet();
      sheet.appendRow([new Date(), level, source, message, getCurrentUserEmail_()]);
    } catch (e) {
      // Không để lỗi ghi log làm crash luồng chính — chỉ in ra console.
      console.error('Logger_._appendLog thất bại: ' + e.message);
    }
  }
};