/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

import { t } from "@/utils/i18n";
import type { WmsTxnFormValues } from "@/types/wms.types";

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

export type WmsTransactionModalProps = {
  lang: "vi" | "en";
  txnType: "Inbound" | "Outbound";
  form: WmsTxnFormValues;
  setForm: (form: WmsTxnFormValues) => void;
  productOptions: ProductOption[];
  flockOptions: FlockOption[];
  wmsLocationOptions: TenantOption[];
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
};

export function WmsTransactionModal({
  lang,
  txnType,
  form,
  setForm,
  productOptions,
  flockOptions,
  wmsLocationOptions,
  onSubmit,
  onClose,
}: WmsTransactionModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content card">
        <h2 className="modal-title">
          {txnType === "Inbound"
            ? `📥 ${t("wmsInbound", lang)}`
            : `📤 ${t("wmsOutbound", lang)}`}{" "}
          WMS
        </h2>
        <form onSubmit={onSubmit} className="form-grid">
          <div className="form-group">
            <label>{t("hTenantId", lang)}:</label>
            <input value={form.tenant_id} disabled />
          </div>
          <div className="form-group">
            <label>Flock</label>
            <input
              value={`${form.flock_id} - ${flockOptions.find((flock) => flock.flockId === form.flock_id)?.name || ""}`}
              disabled
            />
          </div>
          <div className="form-group">
            <label>{t("hSku", lang)}:</label>
            <select
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
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
            <label>Nơi gửi:</label>
            {txnType === "Inbound" ? (
              <select
                value={form.from_location}
                onChange={(event) =>
                  setForm({ ...form, from_location: event.target.value })
                }
                required
              >
                {wmsLocationOptions.map((tenant) => (
                  <option
                    key={tenant.id}
                    value={tenant.managedBy || tenant.name}
                  >
                    {tenant.managedBy || tenant.name}
                  </option>
                ))}
              </select>
            ) : (
              <input value={form.from_location} disabled />
            )}
          </div>
          <div className="form-group">
            <label>Nơi nhận:</label>
            {txnType === "Outbound" ? (
              <select
                value={form.to_location}
                onChange={(event) =>
                  setForm({ ...form, to_location: event.target.value })
                }
                required
              >
                {wmsLocationOptions.map((tenant) => (
                  <option
                    key={tenant.id}
                    value={tenant.managedBy || tenant.name}
                  >
                    {tenant.managedBy || tenant.name}
                  </option>
                ))}
              </select>
            ) : (
              <input value={form.to_location} disabled />
            )}
          </div>
          <div className="form-group form-group-wide">
            <label>Ghi chú:</label>
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
              Xác nhận{" "}
              {txnType === "Inbound"
                ? t("wmsInbound", lang)
                : t("wmsOutbound", lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
