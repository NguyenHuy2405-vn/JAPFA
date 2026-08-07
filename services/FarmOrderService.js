/**
 * =============================================================================
 * FILE: FarmOrderService.gs
 * PURPOSE: API cho luong goi y tao don Farm tu du lieu WMS + FMS + Product.
 *          Khong ghi OMS truc tiep; FE van goi OMSService.createOrder().
 * =============================================================================
 */

/**
 * Lay thong tin tong quan cho khu vuc Current Inventory cua WMS Farm.
 *
 * @param {string} flockId
 * @returns {{success:boolean, data:Object}}
 */
function getFarmOrderInfo(flockId) {
  try {
    Validation_.requireField(flockId, 'flockId');

    const cfg = findConfigByFlockId_(flockId);
    if (!cfg) {
      throw new Error('NO_CONFIG::Khong tim thay cau hinh cho flock da chon.');
    }

    const current = _getCurrentFmsRow_(flockId);
    if (!current) {
      throw new Error('NO_FMS::Chua co du lieu FMS cho flock da chon.');
    }

    const date1 = _findLatestWmsFarmDateBeforeToday_(flockId);
    const date2 = _findDate2_(flockId);

    return success_({
      flockId: String(flockId || '').trim(),
      flockName: cfg['FLOCK_NAME'] || '',
      farm: cfg['Managed by'] || cfg['Managed_by'] || cfg['Tenant'] || '',
      tenantId: cfg['Tenant_id'] || '',
      tenantName: cfg['Tenant'] || '',
      feedName: current['FEED_NAME'] || '',
      warningLabel: current['Inventory Thresholds'] || '',
      currentInventory: Number(current['FEED_end_qtty']) || 0,
      stockLevelPercentage: current['Stock level percentage'] || null,
      date1: date1 || null,
      date2: date2 || null,
    });
  } catch (e) {
    Logger_.logError('FarmOrderService.getFarmOrderInfo', e);
    return error_(e, 'GET_FARM_ORDER_INFO_FAILED');
  }
}

/**
 * Tinh Suggested Qty theo Date2 va Storage Days.
 *
 * @param {string} flockId
 * @param {number} storageDays
 * @returns {{success:boolean, data:Object}}
 */
function calcSuggestedQty(flockId, storageDays) {
  try {
    Validation_.requireField(flockId, 'flockId');

    const storage = Number(storageDays);
    if (isNaN(storage) || storage < 0 || Math.floor(storage) !== storage) {
      throw new Error('INVALID_STORAGE_DAYS::Storage Days phai la so nguyen >= 0.');
    }

    const current = _getCurrentFmsRow_(flockId);
    if (!current) {
      throw new Error('NO_FMS::Chua co du lieu FMS cho flock da chon.');
    }

    const date2 = _findDate2_(flockId);
    if (!date2) {
      throw new Error('NO_DATE2::Khong tim thay Date 2 tu du lieu forecast.');
    }

    const refDate = new Date(date2);
    refDate.setDate(refDate.getDate() + storage);

    const suggestedQty = _getFeedEndQtyAtDate_(flockId, refDate);
    if (suggestedQty === null || suggestedQty === undefined) {
      throw new Error('NO_REF_DATE_QTY::Khong tim thay FEED_end_qtty tai ngay tham chieu.');
    }

    const projectedEndQtyKg = Number(suggestedQty) || 0;
    const isEnoughUntilRefDate = projectedEndQtyKg > 0;
    const suggestedOrderQtyKg = projectedEndQtyKg < 0 ? Math.abs(projectedEndQtyKg) : 0;

    const infoMessage = isEnoughUntilRefDate
      ? ('Hang van du dung den ngay ' + formatDate_(refDate, 'dd/MM/yyyy') + '.')
      : (suggestedOrderQtyKg > 0
          ? ('Can de xuat dat ' + suggestedOrderQtyKg + ' kg de bu thieu den ngay tham chieu.')
          : 'Ton kho du kien bang 0 tai ngay tham chieu.');

    return success_({
      flockId: String(flockId || '').trim(),
      feedName: current['FEED_NAME'] || '',
      date2: date2,
      referenceDate: refDate,
      projectedEndQtyKg: projectedEndQtyKg,
      suggestedQtyKg: suggestedOrderQtyKg,
      isEnoughUntilRefDate: isEnoughUntilRefDate,
      infoMessage: infoMessage,
      storageDays: storage,
    });
  } catch (e) {
    Logger_.logError('FarmOrderService.calcSuggestedQty', e);
    return error_(e, 'CALC_SUGGESTED_QTY_FAILED');
  }
}

/**
 * Tinh so bao goi y theo SKU packaging va khoi luong de xuat.
 *
 * @param {number} suggestedQtyKg
 * @param {string} packagingSku
 * @returns {{success:boolean, data:Object}}
 */
function calcSuggestedBagQty(suggestedQtyKg, packagingSku) {
  try {
    const qty = Number(suggestedQtyKg);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('INVALID_SUGGESTED_QTY::Suggested Quantity phai lon hon 0.');
    }
    Validation_.requireField(packagingSku, 'packagingSku');

    const product = findProductBySku_(packagingSku);
    if (!product) {
      throw new Error('NO_PACKAGING_SKU::Khong tim thay Packaging SKU da chon.');
    }

    const uomWeight = Number(product['UOM_weight_kg']);
    if (isNaN(uomWeight) || uomWeight <= 0) {
      throw new Error('INVALID_UOM_WEIGHT::Thieu hoac sai UOM_weight_kg cua Packaging SKU.');
    }

    const suggestedBags = Math.ceil(qty / uomWeight);

    return success_({
      packagingSku: String(packagingSku || '').trim(),
      uom: product['UOM'] || '',
      uomWeightKg: uomWeight,
      suggestedQtyKg: qty,
      suggestedBags: suggestedBags,
    });
  } catch (e) {
    Logger_.logError('FarmOrderService.calcSuggestedBagQty', e);
    return error_(e, 'CALC_SUGGESTED_BAG_QTY_FAILED');
  }
}
