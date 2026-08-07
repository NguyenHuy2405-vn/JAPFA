/**
 * =============================================================================
 * FILE: FeedStandardService.gs
 * PURPOSE: Đọc dữ liệu `Feed_Standard` (định mức TĂ theo Loại Gà + Ngày Tuổi).
 *          Ghi dữ liệu thuộc SetupService.gs (upsertFeedStandard) — file này
 *          CHỈ ĐỌC.
 *
 * ⚠️ QUAN TRỌNG: Sheet này có 2 HEADER ROW. Config.gs (SHEET_LAYOUT.FEED_STANDARD)
 *    đã đặt headerRow=2 (tên tiếng Việt thật, dùng trong công thức
 *    Standards[...]) và dataStartRow=3. Utils.getSheetData_() TỰ ĐỘNG đọc
 *    đúng theo layout này — Service ở đây KHÔNG cần xử lý gì thêm, nhưng
 *    PHẢI luôn gọi qua getSheetData_('FEED_STANDARD') chứ không tự viết
 *    getRange() thủ công, để tránh lặp lại lỗi đọc nhầm header row 1.
 *
 * AUTHOR: (placeholder)
 * DEPENDENCIES: Utils.gs, ApiResponse.gs
 * REFERENCE: Japfa_Technical_Reference.md §4.3, §6 (F2/F8), §11 (rủi ro đổi header)
 * =============================================================================
 */

/**
 * Lấy danh sách định mức thức ăn, có thể lọc theo Loại Gà.
 *
 * @param {string} [loaiGa] - VD 'ChoiNoi_Male_GiaLai'. Bỏ trống = lấy tất cả
 *        (798 dòng — cân nhắc luôn truyền loaiGa từ FE để giảm tải).
 * @returns {{success:boolean, data:Object[]}}
 * @example
 * getFeedStandardList('ChoiNoi_Male_GiaLai');
 */
function getFeedStandardList(loaiGa) {
  try {
    const rows = getSheetData_('FEED_STANDARD');
    const filtered = loaiGa ? rows.filter(function (r) {
      return String(r['Loại Gà']).trim() === String(loaiGa).trim();
    }) : rows;
    return success_(filtered);
  } catch (e) {
    Logger_.logError('FeedStandardService.getFeedStandardList', e);
    return error_(e, 'GET_FEED_STANDARD_FAILED');
  }
}

/**
 * Lấy danh sách các "Loại Gà" duy nhất — dùng cho dropdown "Standards applied"
 * ở form Config (Setup) và bộ lọc Dashboard FMS.
 *
 * @returns {{success:boolean, data:string[]}}
 * @example
 * getDistinctLoaiGa();
 */
function getDistinctLoaiGa() {
  try {
    const rows = getSheetData_('FEED_STANDARD');
    const set = {};
    rows.forEach(function (r) { if (r['Loại Gà']) set[r['Loại Gà']] = true; });
    return success_(Object.keys(set).sort());
  } catch (e) {
    Logger_.logError('FeedStandardService.getDistinctLoaiGa', e);
    return error_(e, 'GET_DISTINCT_LOAI_GA_FAILED');
  }
}

/**
 * Tìm 1 dòng định mức theo khoá composite [Loại Gà + Ngày Tuổi] — dùng nội
 * bộ bởi FMSService/DashboardService khi cần tra cứu FEED_QTY_USE_est thủ
 * công (hiếm khi cần vì FMS đã có công thức F8 tính sẵn, chỉ dùng khi
 * verify/debug).
 *
 * @param {string} loaiGa
 * @param {number} ngayTuoi
 * @returns {Object|null}
 * @example
 * findFeedStandard_('ChoiNoi_Male_GiaLai', 1);
 */
function findFeedStandard_(loaiGa, ngayTuoi) {
  const rows = getSheetData_('FEED_STANDARD');
  return rows.find(function (r) {
    return String(r['Loại Gà']).trim() === String(loaiGa).trim() &&
      Number(r['Ngày Tuổi']) === Number(ngayTuoi);
  }) || null;
}