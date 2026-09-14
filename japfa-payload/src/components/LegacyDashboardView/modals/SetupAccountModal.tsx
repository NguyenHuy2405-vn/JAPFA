/**
 * @deprecated This component is legacy UI.
 * Use role-specific layouts (/admin, /operation, /farm) instead.
 * Will be removed in Phase 11.
 */

"use client";

import { t } from "@/utils/i18n";
import {
  BLOCK_OPTIONS,
  BLOCK_SYSTEM_OPTIONS,
  type AccountBlock,
  type AccountRow,
} from "@/utils/setupAccountFilters";
import type { SetupAccountForm } from "../hooks/useSetupData";

export type SetupAccountModalProps = {
  lang: "vi" | "en";
  editing: boolean;
  form: SetupAccountForm;
  setForm: (form: SetupAccountForm) => void;
  chickenTypeOptions: string[];
  farmTenantRowsForFlockForm: AccountRow[];
  deriveFlockGroup: (farmTenantId: string) => string;
  nextFlockTenantId: (group: string) => string;
  buildDefaultAccountForm: (block: AccountBlock) => SetupAccountForm;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
};

export function SetupAccountModal({
  lang,
  editing,
  form,
  setForm,
  chickenTypeOptions,
  farmTenantRowsForFlockForm,
  deriveFlockGroup,
  nextFlockTenantId,
  buildDefaultAccountForm,
  onSubmit,
  onClose,
}: SetupAccountModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content card">
        <h2 className="modal-title">
          {t(
            editing ? "setupAccountEditModalTitle" : "setupAccountModalTitle",
            lang,
          )}
        </h2>
        <form className="form-grid" onSubmit={onSubmit}>
          {editing && (
            <div className="form-group form-group-wide setup-edit-summary">
              {BLOCK_OPTIONS.find((o) => o.value === form.block)?.label}
              {" · "}
              {form.system}
            </div>
          )}
          <div
            className="form-group"
            style={editing ? { display: "none" } : undefined}
          >
            <label>{t("fServiceBlock", lang)}</label>
            <select
              value={form.block}
              onChange={(e) =>
                setForm(buildDefaultAccountForm(e.target.value as AccountBlock))
              }
            >
              {BLOCK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div
            className="form-group"
            style={editing ? { display: "none" } : undefined}
          >
            <label>{t("fSystem", lang)}</label>
            <select
              value={form.system}
              disabled={BLOCK_SYSTEM_OPTIONS[form.block].length <= 1}
              onChange={(e) => {
                const system = e.target.value;
                const tenant =
                  form.block === "factory" ? `${system}_0` : form.tenant;
                setForm({
                  ...form,
                  system,
                  tenant,
                  tenant_id: form.block === "factory" ? tenant : form.tenant_id,
                });
              }}
            >
              {BLOCK_SYSTEM_OPTIONS[form.block].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {form.block === "flock" ? (
            <>
              <div className="form-group form-group-wide">
                <label>{t("fFarmRef", lang)}</label>
                <select
                  required
                  value={form.farm_tenant_id}
                  onChange={(e) => {
                    const farm = farmTenantRowsForFlockForm.find(
                      (row) => row.tenant_id === e.target.value,
                    );
                    setForm({
                      ...form,
                      farm_tenant_id: e.target.value,
                      address_of_tenant: farm?.address_of_tenant || "",
                      source_group: deriveFlockGroup(e.target.value),
                    });
                  }}
                >
                  <option value="">-</option>
                  {farmTenantRowsForFlockForm.map((row) => (
                    <option key={row.tenant_id} value={row.tenant_id}>
                      {row.tenant_id} - {row.tenant}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t("fTenant", lang)}</label>
                <input
                  value={form.source_group}
                  onChange={(e) =>
                    setForm({ ...form, source_group: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>{t("fTenantId", lang)}</label>
                <input
                  readOnly
                  value={
                    editing
                      ? form.tenant_id
                      : nextFlockTenantId(form.source_group)
                  }
                />
                <div className="form-hint">{t("fTenantIdFlockHint", lang)}</div>
              </div>
              <div className="form-group">
                <label>{t("fManagedBy", lang)}</label>
                <input
                  readOnly
                  value={
                    farmTenantRowsForFlockForm.find(
                      (row) => row.tenant_id === form.farm_tenant_id,
                    )?.managed_by || ""
                  }
                />
                <div className="form-hint">
                  {t("fManagedByFlockHint", lang)}
                </div>
              </div>
              <div className="form-group">
                <label>{t("fFlock", lang)}</label>
                <input
                  required
                  value={form.flock_id}
                  onChange={(e) =>
                    setForm({ ...form, flock_id: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>{t("fFlockName", lang)}</label>
                <input
                  value={form.flock_name}
                  onChange={(e) =>
                    setForm({ ...form, flock_name: e.target.value })
                  }
                />
              </div>
              <div className="form-group form-group-wide">
                <label>{t("fStandardsApplied", lang)}</label>
                <div className="standards-checklist">
                  {chickenTypeOptions.length === 0 ? (
                    <span className="text-muted">-</span>
                  ) : (
                    chickenTypeOptions.map((value) => (
                      <label key={value} className="standards-checklist-item">
                        <input
                          type="checkbox"
                          checked={form.standards_applied.includes(value)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...form.standards_applied, value]
                              : form.standards_applied.filter(
                                  (v) => v !== value,
                                );
                            setForm({ ...form, standards_applied: next });
                          }}
                        />
                        <span>{value}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>{t("fStartFlockCount", lang)}</label>
                <input
                  type="number"
                  value={form.start_flock_count}
                  onChange={(e) =>
                    setForm({ ...form, start_flock_count: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>{t("fStartFlockDate", lang)}</label>
                <input
                  type="date"
                  value={form.start_flock_date}
                  onChange={(e) =>
                    setForm({ ...form, start_flock_date: e.target.value })
                  }
                />
              </div>
            </>
          ) : (
            <>
              {form.block !== "factory" && (
                <div className="form-group">
                  <label>{t("fTenant", lang)}</label>
                  <input
                    required
                    value={form.tenant}
                    onChange={(e) => {
                      const tenant = e.target.value;
                      setForm({
                        ...form,
                        tenant,
                        tenant_id:
                          form.block === "farm" ? tenant : form.tenant_id,
                      });
                    }}
                  />
                </div>
              )}
              {form.block !== "farm" && (
                <div className="form-group">
                  <label>{t("fTenantId", lang)}</label>
                  <input
                    required
                    readOnly={form.block === "factory"}
                    value={form.tenant_id}
                    onChange={(e) =>
                      setForm({ ...form, tenant_id: e.target.value })
                    }
                  />
                  {form.block === "factory" && (
                    <div className="form-hint">
                      Prefix cố định: {form.system}_0 (nhập hậu tố hoặc
                      Tenant_id đầy đủ)
                    </div>
                  )}
                </div>
              )}
              <div className="form-group">
                <label>{t("fManagedBy", lang)}</label>
                <input
                  value={form.managed_by}
                  onChange={(e) =>
                    setForm({ ...form, managed_by: e.target.value })
                  }
                />
              </div>
              <div className="form-group form-group-wide">
                <label>{t("fAddress", lang)}</label>
                <input
                  value={form.address_of_tenant}
                  onChange={(e) =>
                    setForm({ ...form, address_of_tenant: e.target.value })
                  }
                />
              </div>
            </>
          )}

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
