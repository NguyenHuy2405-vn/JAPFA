/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

import { t } from "@/utils/i18n";
import type { OmsOrderFormValues } from "@/types/oms.types";

type TenantOption = {
  id: number | string;
  tenantId: string;
  name: string;
  type?: string;
  system?: string;
  managedBy?: string;
};
type ProductOption = { id: number | string; sku: string; name: string };
type FlockOption = {
  id: number | string;
  flockId: string;
  name?: string;
  tenantId?: string;
};

export type CreateOrderModalProps = {
  lang: "vi" | "en";
  editingOrderId: string | null;
  form: OmsOrderFormValues;
  setForm: (form: OmsOrderFormValues) => void;
  operationalTenants: TenantOption[];
  productOptions: ProductOption[];
  tenantOptions: TenantOption[];
  flockOptions: FlockOption[];
  orderLocationOptions: TenantOption[];
  orderFlockOptions: FlockOption[];
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
};

export function CreateOrderModal({
  lang,
  editingOrderId,
  form,
  setForm,
  operationalTenants,
  productOptions,
  tenantOptions,
  flockOptions,
  orderLocationOptions,
  orderFlockOptions,
  onSubmit,
  onClose,
}: CreateOrderModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content card">
        <h2 className="modal-title">
          {editingOrderId
            ? "✏️ Sửa đơn hàng (OMS)"
            : `➕ ${t("btnCreateOrder", lang)} (OMS)`}
        </h2>
        <form onSubmit={onSubmit} className="form-grid">
          {editingOrderId && (
            <>
              <div className="form-group form-group-wide">
                <label>Mã đơn hàng:</label>
                <input value={editingOrderId} disabled />
              </div>
              <div className="form-group form-group-wide">
                <label>Trạng thái:</label>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value })
                  }
                >
                  <option value="PLANNED">{t("statusPlanned", lang)}</option>
                  <option value="PICKED_UP">{t("statusDeducted", lang)}</option>
                  <option value="IN_TRANSIT">
                    {t("statusInTransit", lang)}
                  </option>
                  <option value="COMPLETED">
                    {t("statusCompleted", lang)}
                  </option>
                </select>
              </div>
            </>
          )}
          <div className="form-group">
            <label>{t("hTenantId", lang)}:</label>
            {editingOrderId ? (
              <input value={form.tenant_id} disabled />
            ) : (
              <select
                value={form.tenant_id}
                onChange={(e) =>
                  setForm({ ...form, tenant_id: e.target.value })
                }
                required
              >
                <option value="">Chọn Tenant đặt hàng</option>
                {operationalTenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.tenantId}>
                    {tenant.tenantId} - {tenant.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="form-group">
            <label>{t("hClient", lang)}:</label>
            <input
              type="text"
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
              placeholder="VD: Trại Gà Tam Đảo"
              required
            />
          </div>
          <div className="form-group">
            <label>{t("hSku", lang)}:</label>
            <select
              value={form.ma_hang}
              onChange={(e) => setForm({ ...form, ma_hang: e.target.value })}
            >
              {productOptions.map((product) => (
                <option key={product.id} value={product.sku}>
                  {product.sku} - {product.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{t("hQty", lang)} (Bao):</label>
            <input
              type="number"
              value={form.so_luong}
              onChange={(e) =>
                setForm({ ...form, so_luong: Number(e.target.value) })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Đơn vị tính:</label>
            <input
              type="text"
              value={form.uom}
              onChange={(e) => setForm({ ...form, uom: e.target.value })}
              placeholder="Ví dụ: Bao"
              required
            />
          </div>
          <div className="form-group">
            <label>{t("hFrom", lang)}:</label>
            <select
              value={form.noi_i}
              onChange={(e) => setForm({ ...form, noi_i: e.target.value })}
            >
              <option value="">Chọn nơi gửi</option>
              {form.noi_i &&
                !orderLocationOptions.some(
                  (tenant) => (tenant.managedBy || tenant.name) === form.noi_i,
                ) && <option value={form.noi_i}>{form.noi_i}</option>}
              {orderLocationOptions.map((tenant) => (
                <option key={tenant.id} value={tenant.managedBy || tenant.name}>
                  {tenant.managedBy || tenant.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{t("hTo", lang)}:</label>
            <select
              value={form.noi_en}
              onChange={(e) =>
                setForm({
                  ...form,
                  noi_en: e.target.value,
                  ...(editingOrderId
                    ? {}
                    : {
                        tenant_id:
                          tenantOptions.find(
                            (tenant) =>
                              (tenant.managedBy || tenant.name) ===
                              e.target.value,
                          )?.tenantId || form.tenant_id,
                      }),
                  flock_id:
                    flockOptions.find(
                      (flock) =>
                        flock.tenantId ===
                        tenantOptions.find(
                          (tenant) =>
                            (tenant.managedBy || tenant.name) ===
                            e.target.value,
                        )?.tenantId,
                    )?.flockId || "",
                })
              }
            >
              <option value="">Chọn nơi nhận</option>
              {form.noi_en &&
                !orderLocationOptions.some(
                  (tenant) => (tenant.managedBy || tenant.name) === form.noi_en,
                ) && <option value={form.noi_en}>{form.noi_en}</option>}
              {orderLocationOptions.map((tenant) => (
                <option key={tenant.id} value={tenant.managedBy || tenant.name}>
                  {tenant.managedBy || tenant.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Mã đàn gà:</label>
            <select
              value={form.flock_id}
              onChange={(e) => setForm({ ...form, flock_id: e.target.value })}
              required
            >
              <option value="">Chọn đàn gà</option>
              {orderFlockOptions.map((flock) => (
                <option key={flock.id} value={flock.flockId}>
                  {flock.flockId} - {flock.name || ""}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Ngày lấy hàng:</label>
            <input
              type="date"
              value={form.pickup_date}
              onChange={(e) =>
                setForm({ ...form, pickup_date: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Ngày giao dự kiến:</label>
            <input
              type="date"
              value={form.expected_delivery_date}
              onChange={(e) =>
                setForm({ ...form, expected_delivery_date: e.target.value })
              }
              required
            />
          </div>
          <div className="form-group form-group-wide">
            <label>Ghi chú:</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={3}
              placeholder="Thông tin bổ sung cho đơn hàng"
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
              {editingOrderId ? "Lưu thay đổi" : t("btnCreateOrder", lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
