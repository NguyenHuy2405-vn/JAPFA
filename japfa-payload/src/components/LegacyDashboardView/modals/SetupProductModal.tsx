/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

import { t } from "@/utils/i18n";
import type { SetupProductForm } from "@/types/setup.types";

export type SetupProductModalProps = {
  lang: "vi" | "en";
  form: SetupProductForm;
  setForm: (form: SetupProductForm) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
};

export function SetupProductModal({
  lang,
  form,
  setForm,
  onSubmit,
  onClose,
}: SetupProductModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content card">
        <h2 className="modal-title">{t("setupProductBtn", lang)}</h2>
        <form className="form-grid" onSubmit={onSubmit}>
          <div className="form-group form-group-wide">
            <label>{t("hProductName", lang)}</label>
            <input
              required
              value={form.ten_hang_hoa}
              onChange={(e) =>
                setForm({ ...form, ten_hang_hoa: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>{t("fProductType", lang)}</label>
            <input
              value={form.loai_san_pham}
              onChange={(e) =>
                setForm({ ...form, loai_san_pham: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>{t("fUom", lang)}</label>
            <input
              value={form.uom}
              onChange={(e) => setForm({ ...form, uom: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t("fUomWeight", lang)}</label>
            <input
              type="number"
              required
              min="0.1"
              step="0.1"
              value={form.uom_weight_kg}
              onChange={(e) =>
                setForm({ ...form, uom_weight_kg: Number(e.target.value) })
              }
            />
          </div>
          <div className="form-group">
            <label>{t("hStatus", lang)}</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
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
