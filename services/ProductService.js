/**
 * =============================================================================
 * FILE: ProductService.gs
 * PURPOSE: Đọc dữ liệu `Product_Master` (danh mục SKU thức ăn). Ghi dữ liệu
 *          thuộc về SetupService.gs (upsertProductMaster) — file này CHỈ ĐỌC.
 * AUTHOR: (placeholder)
 * DEPENDENCIES: Utils.gs, ApiResponse.gs
 * REFERENCE: Japfa_Technical_Reference.md §4.2, F1-F3
 * =============================================================================
 */

/**
 * Lấy danh sách Product_Master, có thể lọc.
 *
 * @param {Object} [filters] - VD { Status: 'ACTIVE' }.
 * @returns {{success:boolean, data:Object[]}}
 * @example
 * getProductMasterList({ Status: 'ACTIVE' });
 */
function getProductMasterList(filters) {
  try {
    const rows = getSheetData_('PRODUCT_MASTER');
    return success_(filterRows_(rows, filters));
  } catch (e) {
    Logger_.logError('ProductService.getProductMasterList', e);
    return error_(e, 'GET_PRODUCT_MASTER_FAILED');
  }
}

/**
 * Lấy danh sách tên hàng hóa (Tên hàng hóa) đang ACTIVE — dùng cho dropdown
 * "Loại cám" ở form Feed_Standard (Setup) và "Mã hàng" ở form Order/WMS.
 *
 * @returns {{success:boolean, data:string[]}}
 * @example
 * getActiveProductNames();
 */
function getActiveProductNames() {
  try {
    const rows = getSheetData_('PRODUCT_MASTER').filter(function (r) {
      return String(r['Status']).trim().toUpperCase() === 'ACTIVE';
    });
    const names = rows.map(function (r) { return r['Tên hàng hóa']; });
    return success_(names);
  } catch (e) {
    Logger_.logError('ProductService.getActiveProductNames', e);
    return error_(e, 'GET_ACTIVE_PRODUCT_NAMES_FAILED');
  }
}

/**
 * Tìm 1 sản phẩm theo SKU — dùng nội bộ bởi OMSService (lấy UOM auto khi
 * chọn Mã hàng trong form tạo Order, theo PRD §3.4).
 *
 * @param {string} sku
 * @returns {Object|null}
 * @example
 * findProductBySku_('C01S+_Bag_40');
 */
function findProductBySku_(sku) {
  const rows = getSheetData_('PRODUCT_MASTER');
  return rows.find(function (r) { return String(r['SKU']).trim() === String(sku).trim(); }) || null;
}

/**
 * API công khai cho FE — lấy 1 sản phẩm theo SKU (bọc findProductBySku_
 * trong response chuẩn envelope).
 *
 * @param {string} sku
 * @returns {{success:boolean, data:(Object|null)}}
 * @example
 * getProductBySKU('C01S+_Bag_40');
 */
function getProductBySKU(sku) {
  try {
    Validation_.requireField(sku, 'SKU');
    return success_(findProductBySku_(sku));
  } catch (e) {
    Logger_.logError('ProductService.getProductBySKU', e);
    return error_(e, 'GET_PRODUCT_BY_SKU_FAILED');
  }
}