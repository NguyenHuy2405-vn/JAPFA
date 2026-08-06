/**
 * =============================================================================
 * FILE: Auth.gs
 * PURPOSE: Xác thực user (qua Session.getActiveUser()) và khung phân quyền.
 *
 * ⚠️ QUYẾT ĐỊNH KIẾN TRÚC ĐÃ CHỐT (xem hội thoại xác nhận với Product Owner):
 *    Sheet `User_Roles` KHÔNG tồn tại trong dữ liệu thật (Technical Reference
 *    TD-14) và cột permission dự kiến "để trống ở v2" theo đúng PRD (TD-08).
 *    → Ở bản build này, mọi user đã đăng nhập (có Google account hợp lệ)
 *      được ALLOW-ALL — không chặn bất kỳ thao tác nào theo Role/Tenant.
 *    → `resolvePermission_()` vẫn được MỌI Service gọi trước khi ghi/đọc
 *      dữ liệu nhạy cảm (đúng nguyên tắc PRD §4: "chặn ở tầng server, không
 *      chỉ ẩn UI ở tầng client"), nhưng hiện tại luôn trả `true`.
 *    → Khi có sheet `User_Roles` thật, CHỈ CẦN sửa nội dung hàm
 *      `resolvePermission_()` bên dưới — không cần sửa bất kỳ Service nào
 *      khác vì tất cả đều gọi qua điểm vào duy nhất này.
 *
 * AUTHOR: (placeholder)
 * DEPENDENCIES: Utils.gs (getCurrentUserEmail_), Constants.gs (ROLES, ROLE_LANDING_VIEW)
 * REFERENCE: Japfa_PRD.md §2, §4; Technical Reference TD-08, TD-14
 * =============================================================================
 */

/**
 * Lấy thông tin user hiện tại đang truy cập Web App.
 *
 * ⚠️ Vì chưa có sheet User_Roles, Role trả về hiện tại LUÔN là 'Admin'
 * (để mọi UI/menu hiển thị đầy đủ, không bị ẩn theo Role thật). Đây là
 * hành vi tạm thời — đã ghi rõ trong comment để không ai nhầm là final.
 *
 * @returns {{email:string, role:string, tenantScope:string[], landingView:string}}
 * @example
 * const user = getUserRole_();
 * // { email: 'staff@japfa.com', role: 'Admin', tenantScope: [], landingView: 'dashboard' }
 */
function getUserRole_() {
  const email = getCurrentUserEmail_();

  // TODO (khi có User_Roles thật): thay đoạn dưới bằng tra cứu thật:
  //   const roleRows = getSheetData_('USER_ROLES');
  //   const found = roleRows.find(r => r['Email'] === email);
  //   role = found ? found['Role'] : ROLES.ADMIN (fallback);
  //   tenantScope = found ? (found['Tenant_scope'] || '').split(',') : [];
  const role = ROLES.ADMIN;

  return {
    email: email,
    role: role,
    tenantScope: [],
    landingView: ROLE_LANDING_VIEW[role] || VIEW_NAMES.DASHBOARD,
    permissionSource: "legacy_allow_all",
  };
}

/**
 * Kiểm tra quyền thực hiện 1 hành động — ĐIỂM VÀO DUY NHẤT cho mọi kiểm
 * tra phân quyền trong hệ thống. Mọi Service (OMSService, WMSService,
 * SetupService...) PHẢI gọi hàm này trước khi thực hiện ghi/đọc dữ liệu
 * nhạy cảm, kể cả khi hiện tại nó luôn trả về true.
 *
 * @param {string} role - Role của user, lấy từ getUserRole_().role.
 * @param {string} permissionKey - Khoá quyền, VD: 'wms.adjustment.write',
 *        'setup.config.write', 'oms.create'. Dùng dấu chấm phân cấp
 *        module.action để dễ mở rộng sau này.
 * @param {string} [tenantId] - Tenant liên quan (nếu hành động giới hạn
 *        theo Tenant scope) — hiện chưa dùng vì tenantScope rỗng.
 * @returns {boolean} true nếu được phép, false nếu bị chặn.
 * @example
 * if (!resolvePermission_(user.role, 'setup.config.write')) {
 *   return error_('Bạn không có quyền thực hiện thao tác này.', 'PERMISSION_DENIED');
 * }
 */
function resolvePermission_(role, permissionKey, tenantId) {
  // ⚠️ ALLOW-ALL tạm thời — xem giải thích ở đầu file.
  // Không xoá tham số role/permissionKey/tenantId dù chưa dùng, để giữ
  // đúng signature khi cắm logic thật vào sau, tránh phải sửa lại mọi
  // lệnh gọi resolvePermission_() rải rác trong các Service.
  return true;
}

/**
 * Guard ngắn gọn dùng ở đầu mỗi Service function ghi dữ liệu — ném lỗi
 * ngay nếu không có quyền, để Service không cần tự viết if/throw lặp lại.
 *
 * @param {string} permissionKey
 * @param {string} [tenantId]
 * @throws {Error} Nếu không có quyền.
 * @returns {void}
 * @example
 * function upsertConfig(payload) {
 *   requirePermission_('setup.config.write');
 *   ...
 * }
 */
function requirePermission_(permissionKey, tenantId) {
  const user = getUserRole_();
  if (!resolvePermission_(user.role, permissionKey, tenantId)) {
    throw new Error(
      "Bạn không có quyền thực hiện thao tác này (" + permissionKey + ").",
    );
  }
}

/**
 * Public wrapper for frontend bootstrap.
 * google.script.run should call this instead of private-style helpers.
 *
 * @returns {{email:string, role:string, tenantScope:string[], landingView:string}}
 */
function getCurrentUserProfile() {
  const profile = getUserRole_();
  profile.permissions = {
    createOrder: true,
    updateOrderStatus: true,
    wmsAdjustment: true,
    wmsInboundOutbound: true,
    setupConfig: true,
    setupProductMaster: true,
    setupFeedStandard: true,
    setupPolicyThreshold: true,
  };
  return profile;
}
