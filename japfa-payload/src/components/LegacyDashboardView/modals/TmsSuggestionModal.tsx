/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

import type { OmsMergeSuggestion } from "@/types/oms.types";

export type TmsSuggestionModalProps = {
  lang: "vi" | "en";
  suggestions: OmsMergeSuggestion[];
  selected: Record<number, boolean>;
  onToggle: (index: number, checked: boolean) => void;
  formatDate: (value: unknown, lang: "vi" | "en") => string;
  onConfirm: () => void;
  onClose: () => void;
};

export function TmsSuggestionModal({
  lang,
  suggestions,
  selected,
  onToggle,
  formatDate,
  onConfirm,
  onClose,
}: TmsSuggestionModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content card tms-suggestion-modal">
        <div className="modal-header-row">
          <div>
            <h2 className="modal-title">Gợi ý ghép đơn thành TMS</h2>
            <p className="modal-subtitle">
              {suggestions.length
                ? `Có ${suggestions.length} nhóm phù hợp theo nơi nhận và ngày lấy hàng.`
                : "Không có nhóm đơn phù hợp để ghép TMS."}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="tms-suggestion-list">
            {suggestions.map((suggestion, index) => (
              <label
                className="tms-suggestion-item"
                key={`${suggestion.destination}-${suggestion.pickupDate}-${index}`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(selected[index])}
                  onChange={(event) => onToggle(index, event.target.checked)}
                />
                <div className="tms-suggestion-content">
                  <div className="tms-suggestion-title">Nhóm {index + 1}</div>
                  <div className="tms-suggestion-meta">
                    <span>
                      Nơi nhận: <strong>{suggestion.destination || "-"}</strong>
                    </span>
                    <span>
                      Ngày lấy:{" "}
                      <strong>{formatDate(suggestion.pickupDate, lang)}</strong>
                    </span>
                    <span>
                      Khối lượng:{" "}
                      <strong>
                        {Number(suggestion.totalWeightTon || 0).toFixed(2)} tấn
                      </strong>
                    </span>
                  </div>
                  <div className="tms-order-chips">
                    {suggestion.orderIds.map((orderId) => (
                      <span key={orderId}>{orderId}</span>
                    ))}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
          {suggestions.length > 0 && (
            <button className="btn btn-primary" onClick={onConfirm}>
              Tạo TMS cho nhóm đã chọn
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
