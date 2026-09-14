/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

import type {
  FarmOrderFormValues,
  FarmOrderSuggestData,
} from "@/types/wms.types";

type TenantOption = {
  id: number | string;
  tenantId: string;
  name: string;
  type?: string;
  system?: string;
  managedBy?: string;
};

export type FarmOrderWizardModalProps = {
  lang: "vi" | "en";
  tenantFilter: string;
  flockFilter: string;
  step: 1 | 2 | 3;
  loading: boolean;
  data: FarmOrderSuggestData | null;
  form: FarmOrderFormValues;
  setForm: (form: FarmOrderFormValues) => void;
  tenantOptions: TenantOption[];
  formatDate: (value: unknown, lang: "vi" | "en") => string;
  onSuggestSubmit: (event: React.FormEvent) => void;
  onPackageSubmit: (event: React.FormEvent) => void;
  onCreateSubmit: (event: React.FormEvent) => void;
  onBackToStep: (step: 1 | 2) => void;
  onClose: () => void;
};

export function FarmOrderWizardModal({
  lang,
  tenantFilter,
  flockFilter,
  step,
  loading,
  data,
  form,
  setForm,
  tenantOptions,
  formatDate,
  onSuggestSubmit,
  onPackageSubmit,
  onCreateSubmit,
  onBackToStep,
  onClose,
}: FarmOrderWizardModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content card farm-order-modal">
        <div className="modal-header-row">
          <div>
            <h2 className="modal-title">Tạo đơn hàng cho Farm</h2>
            <p className="modal-subtitle">
              {tenantFilter} · {flockFilter}
            </p>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="farm-order-steps" aria-label="Tiến trình tạo đơn">
          {["Dự báo", "Quy cách", "Xác nhận"].map((label, index) => (
            <div
              className={`farm-order-step ${step >= index + 1 ? "active" : ""}`}
              key={label}
            >
              <span>{index + 1}</span>
              {label}
            </div>
          ))}
        </div>

        {step === 1 && (
          <form onSubmit={onSuggestSubmit} className="form-grid">
            <div className="farm-order-intro form-group-wide">
              Hệ thống sẽ lấy ngày trước thời điểm tồn kho dự báo chạm mức 0,
              cộng thêm số ngày dự trữ và tính lượng thiếu tại ngày tham chiếu.
            </div>
            <div className="form-group form-group-wide">
              <label>Số ngày dự trữ</label>
              <input
                type="number"
                min={0}
                step={1}
                value={form.storage_days}
                onChange={(event) =>
                  setForm({ ...form, storage_days: event.target.value })
                }
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
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Đang tính..." : "Tiếp tục"}
              </button>
            </div>
          </form>
        )}

        {step === 2 && data && (
          <form onSubmit={onPackageSubmit} className="form-grid">
            <div className="farm-order-metric">
              <span>Ngày tham chiếu</span>
              <strong>{formatDate(data.referenceDate, lang)}</strong>
            </div>
            <div className="farm-order-metric">
              <span>Lượng cần đặt</span>
              <strong>{data.suggestedQtyKg} kg</strong>
            </div>
            <div className="form-group form-group-wide">
              <label>Packaging SKU</label>
              <select
                value={form.packaging_sku}
                onChange={(event) =>
                  setForm({ ...form, packaging_sku: event.target.value })
                }
                required
              >
                {data.packages.map((item) => (
                  <option key={item.sku} value={item.sku}>
                    {item.sku} | {item.uom} | {item.uomWeightKg} kg
                  </option>
                ))}
              </select>
            </div>
            <div className="farm-order-preview form-group-wide">
              {(() => {
                const selected = data.packages.find(
                  (item) => item.sku === form.packaging_sku,
                );
                const bags = selected?.uomWeightKg
                  ? Math.ceil(
                      Number(data.suggestedQtyKg) /
                        Number(selected.uomWeightKg),
                    )
                  : 0;
                return `Đề xuất ${bags} ${selected?.uom || "bao"}`;
              })()}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onBackToStep(1)}
              >
                Quay lại
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Đang tính..." : "Tiếp tục"}
              </button>
            </div>
          </form>
        )}

        {step === 3 && data && (
          <form onSubmit={onCreateSubmit} className="form-grid">
            <div className="form-group">
              <label>Mã đơn vị (Flock)</label>
              <input value={data.flockGroup || "-"} disabled />
            </div>
            <div className="form-group">
              <label>Khách hàng</label>
              <input
                value={form.client}
                onChange={(event) =>
                  setForm({ ...form, client: event.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Số lượng</label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(event) =>
                  setForm({ ...form, quantity: Number(event.target.value) })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Đơn vị tính</label>
              <input
                value={form.uom}
                onChange={(event) =>
                  setForm({ ...form, uom: event.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Nơi gửi</label>
              <select
                value={form.origin}
                onChange={(event) =>
                  setForm({ ...form, origin: event.target.value })
                }
                required
              >
                {form.origin &&
                  !tenantOptions.some(
                    (tenant) => tenant.name === form.origin,
                  ) && <option value={form.origin}>{form.origin}</option>}
                {tenantOptions
                  .filter((tenant) => tenant.system === "WMS")
                  .map((tenant) => (
                    <option
                      key={tenant.id}
                      value={tenant.managedBy || tenant.name}
                    >
                      {tenant.managedBy || tenant.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label>Nơi nhận</label>
              <input value={form.destination} disabled />
            </div>
            <div className="form-group form-group-wide">
              <label>Ngày giao dự kiến</label>
              <input
                type="date"
                value={form.expected_delivery_date}
                onChange={(event) =>
                  setForm({
                    ...form,
                    expected_delivery_date: event.target.value,
                  })
                }
                required
              />
            </div>
            <div className="form-group form-group-wide">
              <label>Ghi chú</label>
              <textarea
                rows={3}
                value={form.note}
                onChange={(event) =>
                  setForm({ ...form, note: event.target.value })
                }
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onBackToStep(2)}
              >
                Quay lại
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Đang lưu..." : "Tạo đơn hàng"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
