/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

export type TmsConfirmModalProps = {
  mode: "all" | "selected";
  selectedCount: number;
  onConfirm: () => void;
  onClose: () => void;
};

export function TmsConfirmModal({
  mode,
  selectedCount,
  onConfirm,
  onClose,
}: TmsConfirmModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content card tms-confirm-modal">
        <div className="confirm-icon">
          <span className="material-symbols-outlined">auto_awesome</span>
        </div>
        <h2 className="modal-title">Xác nhận tạo TMS hàng loạt</h2>
        <p className="modal-subtitle">
          {mode === "selected"
            ? `Tạo một lô TMS cho ${selectedCount} đơn đã chọn?`
            : "Tạo mã TMS cho toàn bộ đơn chưa hoàn thành và chưa có TMS?"}
        </p>
        <div className="confirm-note">
          Mỗi đơn sẽ được gán một mã TMS riêng để giữ nguyên truy vết vận
          chuyển.
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary" onClick={onConfirm}>
            {mode === "selected"
              ? "Ghép thành một lô TMS"
              : "Tạo TMS cho đơn chưa hoàn thành"}
          </button>
        </div>
      </div>
    </div>
  );
}
