/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

import type { WmsAdjustFormValues } from "@/types/wms.types";

type ProductOption = { id: number | string; sku: string; name: string };
type FlockOption = {
  id: number | string;
  flockId: string;
  name?: string;
  tenantId?: string;
};

export type WmsAdjustModalProps = {
  form: WmsAdjustFormValues;
  setForm: (form: WmsAdjustFormValues) => void;
  productOptions: ProductOption[];
  flockOptions: FlockOption[];
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
};

export function WmsAdjustModal({
  form,
  setForm,
  productOptions,
  flockOptions,
  onSubmit,
  onClose,
}: WmsAdjustModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content card">
        <h2 className="modal-title">Điều chỉnh tồn kho WMS</h2>
        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-group">
            <label>Phạm vi</label>
            <input value="Farm" disabled />
          </div>
          <div className="form-group">
            <label>Tenant</label>
            <input value={form.tenant_id} disabled />
          </div>
          <div className="form-group">
            <label>SKU</label>
            <select
              value={form.sku}
              onChange={(event) =>
                setForm({ ...form, sku: event.target.value })
              }
              required
            >
              {productOptions.map((product) => (
                <option key={product.id} value={product.sku}>
                  {product.sku} - {product.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Flock</label>
            <input
              value={`${form.flock_id} - ${flockOptions.find((flock) => flock.flockId === form.flock_id)?.name || ""}`}
              disabled
            />
          </div>
          <div className="form-group">
            <label>Chênh lệch (+/-)</label>
            <input
              type="number"
              value={form.delta}
              onChange={(event) =>
                setForm({ ...form, delta: Number(event.target.value) })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Lý do</label>
            <select
              value={form.reason}
              onChange={(event) =>
                setForm({ ...form, reason: event.target.value })
              }
            >
              <option>Kiểm kê định kỳ</option>
              <option value="Thất thoát">Thất thoát</option>
              <option value="Sai lệch nhập liệu">Sai lệch nhập liệu</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
          <div className="form-group form-group-wide">
            <label>Ghi chú</label>
            <input
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
              onClick={onClose}
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Xác nhận điều chỉnh
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
