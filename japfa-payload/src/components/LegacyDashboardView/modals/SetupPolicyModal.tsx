/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

import { t } from "@/utils/i18n";
import type { SetupPolicyForm } from "@/types/setup.types";

export type SetupPolicyModalProps = {
  lang: "vi" | "en";
  form: SetupPolicyForm;
  setForm: (form: SetupPolicyForm) => void;
  productRows: any[];
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
};

export function SetupPolicyModal({
  lang,
  form,
  setForm,
  productRows,
  onSubmit,
  onClose,
}: SetupPolicyModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content card">
        <h2 className="modal-title">{t("setupPolicyBtn", lang)}</h2>
        <form className="form-grid" onSubmit={onSubmit}>
          <div className="form-group form-group-wide">
            <label>{t("hSku", lang)}</label>
            <input
              required
              placeholder="Ví dụ: C05S+_Bag_40"
              list="setupPolicySkuList"
              value={form.ma_hang}
              onChange={(e) => setForm({ ...form, ma_hang: e.target.value })}
            />
            <datalist id="setupPolicySkuList">
              {productRows.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.ten_hang_hoa}
                </option>
              ))}
            </datalist>
          </div>
          <div className="form-group">
            <label>{t("fZeroThreshold", lang)}</label>
            <input
              type="number"
              step="0.01"
              required
              value={form.zero_threshold}
              onChange={(e) =>
                setForm({ ...form, zero_threshold: Number(e.target.value) })
              }
            />
          </div>
          <div className="form-group">
            <label>{t("fCriticalThreshold", lang)}</label>
            <input
              type="number"
              step="0.01"
              required
              value={form.critical_threshold}
              onChange={(e) =>
                setForm({ ...form, critical_threshold: Number(e.target.value) })
              }
            />
          </div>
          <div className="form-group">
            <label>{t("fLowThreshold", lang)}</label>
            <input
              type="number"
              step="0.01"
              required
              value={form.low_threshold}
              onChange={(e) =>
                setForm({ ...form, low_threshold: Number(e.target.value) })
              }
            />
          </div>
          <div className="form-group">
            <label>{t("fHighThreshold", lang)}</label>
            <input
              type="number"
              step="0.01"
              required
              value={form.high_threshold}
              onChange={(e) =>
                setForm({ ...form, high_threshold: Number(e.target.value) })
              }
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              {t("commonCancel", lang)}
            </button>
            <button type="submit" className="btn btn-primary">
              {t("commonSave", lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
