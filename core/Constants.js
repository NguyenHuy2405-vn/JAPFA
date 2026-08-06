/**
 * =============================================================================
 * FILE: Constants.gs
 * PURPOSE: Enum/hằng số nghiệp vụ dùng chung — loại giao dịch, trạng thái đơn,
 *          badge tồn kho, tên view, quyền... Tránh magic string rải rác.
 * AUTHOR: (placeholder)
 * DEPENDENCIES: Không có
 * REFERENCE: Japfa_PRD.md §3, Japfa_Technical_Reference.md REF-8,
 *            Japfa_Function_Flows.md §3.2/§4.2
 * =============================================================================
 */

/**
 * Loại giao dịch WMS_farm — theo Function_Flows §3.2.
 * @constant {Object<string,string>}
 */
const WMS_FARM_TXN_TYPE = {
  INBOUND: 'Inbound',
  CONSUME: 'Consume',
  OUTBOUND: 'Outbound',
  LOSS: 'Loss',
  REPORT: 'Report',
  ADJUSTMENT: 'Adjustment' // dùng riêng cho submitAdjustment(), không thuộc bộ gốc Function_Flows
};

/**
 * Loại giao dịch WMS_factory — theo Function_Flows §4.2.
 * Không có Consume (nhà máy không tiêu thụ trực tiếp).
 * @constant {Object<string,string>}
 */
const WMS_FACTORY_TXN_TYPE = {
  INBOUND: 'Inbound',
  OUTBOUND: 'Outbound',
  LOSS: 'Loss',
  REPORT: 'Report',
  ADJUSTMENT: 'Adjustment'
};

/**
 * Trạng thái đơn hàng OMS theo stage vận hành.
 * @constant {Object<string,string>}
 */
const ORDER_STATUS = {
  PLANNED: 'Lên kế hoạch',
  PICKED_UP: 'Đã lấy hàng',
  IN_TRANSIT: 'Chờ giao hàng',
  COMPLETED: 'Hoàn tất'
};

/**
 * Badge cảnh báo tồn kho — theo REF-8, thứ tự so sánh quan trọng
 * (phải check từ Zero → Critical → Low → Safe → High).
 * @constant {Object<string,string>}
 */
const INVENTORY_BADGE = {
  ZERO: 'Zero',
  CRITICAL: 'Critical',
  LOW: 'Low',
  SAFE: 'Safe',
  HIGH: 'High',
  EMPTY: '' // không tìm thấy ngưỡng cho SKU
};

/**
 * Màu badge tương ứng — dùng chung cho FE (trả kèm trong response để UI
 * không phải tự quyết định màu, tránh lệch logic FE/BE).
 * @constant {Object<string,string>}
 */
const INVENTORY_BADGE_COLOR = {
  Zero: '#212529',      // đen
  Critical: '#dc3545',  // đỏ
  Low: '#ffc107',       // vàng
  Safe: '#198754',      // xanh lá
  High: '#0d6efd',      // xanh dương
  '': '#6c757d'         // xám — không xác định
};

/**
 * Lý do điều chỉnh (Adjustment) — theo PRD §3.5.
 * @constant {string[]}
 */
const ADJUSTMENT_REASONS = [
  'Kiểm kê định kỳ',
  'Thất thoát',
  'Sai lệch nhập liệu',
  'Khác'
];

/**
 * Tên view hợp lệ cho Router.gs (doGet param "view").
 * @constant {Object<string,string>}
 */
const VIEW_NAMES = {
  DASHBOARD: 'dashboard',
  FMS: 'fms',
  OMS: 'oms',
  WMS: 'wms',
  SETUP: 'setup'
};

/**
 * Role hệ thống — theo PRD §2. Dùng làm giá trị mặc định hiển thị,
 * KHÔNG dùng để hardcode logic phân quyền (Auth.gs xử lý allow-all tạm thời).
 * @constant {Object<string,string>}
 */
const ROLES = {
  PROCUREMENT: 'Procurement staff',
  INVENTORY: 'Inventory staff',
  OPS: 'OPS staff',
  TECHNICAL: 'Technical staff',
  ADMIN: 'Admin'
};

/**
 * Landing view mặc định theo Role — PRD §2 bảng Role.
 * @constant {Object<string,string>}
 */
const ROLE_LANDING_VIEW = {
  'Procurement staff': VIEW_NAMES.OMS,
  'Inventory staff': VIEW_NAMES.WMS,
  'OPS staff': VIEW_NAMES.WMS,
  'Technical staff': VIEW_NAMES.FMS,
  'Admin': VIEW_NAMES.DASHBOARD
};

/**
 * Số dòng tối đa đọc 1 lần khi không có filter (bảo vệ hiệu năng),
 * FE sẽ phân trang phía client dựa trên tập dữ liệu trả về.
 * @constant {number}
 */
const MAX_ROWS_PER_READ = 5000;