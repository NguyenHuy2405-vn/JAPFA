/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

import { t } from "@/utils/i18n";

export type OrderTraceModalProps = {
  lang: "vi" | "en";
  canEdit: boolean;
  traceOrder: { summary?: any; trace?: { factory?: any[]; farm?: any[] } };
  formatDate: (value: unknown, lang: "vi" | "en") => string;
  onEdit: (order: any) => void;
  onClose: () => void;
};

export function OrderTraceModal({
  lang,
  canEdit,
  traceOrder,
  formatDate,
  onEdit,
  onClose,
}: OrderTraceModalProps) {
  const summary = traceOrder.summary;
  const rows: Array<[string, unknown]> = [
    ["Mã đơn hàng", summary?.orderId || summary?.order_id],
    ["Khách hàng", summary?.client],
    ["Mã hàng (SKU)", summary?.sku || summary?.ma_hang],
    [
      "Số lượng",
      `${summary?.quantity || summary?.so_luong || 0} ${summary?.uom || "Bao"}`,
    ],
    ["Nơi gửi", summary?.origin || summary?.noi_i],
    ["Nơi nhận", summary?.destination || summary?.noi_en],
    ["Mã đàn gà", summary?.flockId],
    ["Ngày lấy hàng", formatDate(summary?.pickupDate, lang)],
    ["Ngày giao dự kiến", formatDate(summary?.expectedDeliveryDate, lang)],
    [
      "Trạng thái",
      summary?.status === "PLANNED"
        ? t("statusPlanned", lang)
        : summary?.status === "PICKED_UP"
          ? t("statusPickedUp", lang)
          : summary?.status === "IN_TRANSIT"
            ? t("statusInTransit", lang)
            : t("statusCompleted", lang),
    ],
    ["Mã TMS", summary?.tmsOrderId],
    ["Ngày tạo", formatDate(summary?.createDate || summary?.create_date, lang)],
    ["Ghi chú", summary?.note],
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content card trace-modal">
        <div className="modal-header-row order-detail-header">
          <h2 className="modal-title">Chi tiết đơn hàng</h2>
          <div className="order-detail-header-actions">
            {String(summary?.status) !== "COMPLETED" && canEdit && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onClose();
                  onEdit(summary);
                }}
              >
                <span className="material-symbols-outlined">edit</span>
                Sửa
              </button>
            )}
            <button className="btn-icon" onClick={onClose} aria-label="Đóng">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <dl className="order-detail-list">
          {rows.map(([label, value]) => (
            <div className="order-detail-row" key={label}>
              <dt>{label}</dt>
              <dd>{(value as any) || "-"}</dd>
            </div>
          ))}
        </dl>
        {((traceOrder.trace?.factory?.length ?? 0) > 0 ||
          (traceOrder.trace?.farm?.length ?? 0) > 0) && (
          <div className="trace-columns order-trace-columns">
            {(["factory", "farm"] as const).map((scope) => (
              <section key={scope}>
                <h3>{scope === "factory" ? "Nhà máy" : "Trang trại"}</h3>
                {(traceOrder.trace?.[scope] || []).map((txn: any) => (
                  <div className="trace-item" key={txn.id}>
                    <strong>{txn.txnType}</strong>
                    <span>
                      {txn.quantity} | {formatDate(txn.date, lang)}
                    </span>
                    <small>{txn.note || "-"}</small>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
