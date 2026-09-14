/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

export type FmsMortModalProps = {
  row: { flock_id: string; date: string };
  value: number;
  onValueChange: (value: number) => void;
  formatDate: (value: unknown, lang: "vi" | "en") => string;
  lang: "vi" | "en";
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
};

export function FmsMortModal({
  row,
  value,
  onValueChange,
  formatDate,
  lang,
  onSubmit,
  onClose,
}: FmsMortModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content card fms-mort-modal">
        <h2 className="modal-title">Cập nhật lượng chết thực tế</h2>
        <form onSubmit={onSubmit} className="form-grid fms-mort-form">
          <div className="form-group">
            <label>Flock</label>
            <input value={row.flock_id} readOnly />
          </div>
          <div className="form-group">
            <label>Ngày</label>
            <input value={formatDate(row.date, lang)} readOnly />
          </div>
          <div className="form-group">
            <label>Lượng chết thực tế</label>
            <input
              type="number"
              min={0}
              step={1}
              value={value}
              onChange={(event) => onValueChange(Number(event.target.value))}
              required
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
