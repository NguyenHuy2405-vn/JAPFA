"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createWmsTransactionAction } from "@/app/actions/farm/wms";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

type Option = { id: string | number; label: string };
type TxnType =
  | "INBOUND"
  | "OUTBOUND"
  | "ADJUSTMENT"
  | "LOSS"
  | "CONSUME"
  | "REPORT";

const TXN_TYPES: TxnType[] = [
  "INBOUND",
  "OUTBOUND",
  "ADJUSTMENT",
  "LOSS",
  "CONSUME",
  "REPORT",
];

type FormState = {
  flockId: string;
  productId: string;
  txnType: TxnType;
  quantity: number;
  reason: string;
  note: string;
};

const initialState: FormState = {
  flockId: "",
  productId: "",
  txnType: "INBOUND",
  quantity: 0,
  reason: "",
  note: "",
};

export function CreateWmsTransactionModal({
  open,
  onClose,
  flocks,
  products,
}: {
  open: boolean;
  onClose: () => void;
  flocks: Option[];
  products: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reasonRequired =
    form.txnType === "ADJUSTMENT" || form.txnType === "LOSS";
  const canSubmit = useMemo(() => {
    if (!form.flockId || !form.productId || form.quantity <= 0) return false;
    if (reasonRequired && form.reason.trim().length < 2) return false;
    return true;
  }, [form, reasonRequired]);

  const closeAndReset = () => {
    setForm(initialState);
    setError("");
    setLoading(false);
    onClose();
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    const response = await createWmsTransactionAction({
      flockId: form.flockId,
      productId: form.productId,
      txnType: form.txnType,
      quantity: Number(form.quantity),
      reason: form.reason || undefined,
      note: form.note || undefined,
    });

    setLoading(false);
    if (response.success) {
      router.refresh();
      closeAndReset();
      return;
    }

    setError(response.message || "Có lỗi xảy ra.");
  };

  return (
    <Modal
      open={open}
      onClose={closeAndReset}
      title="Tạo giao dịch WMS"
      size="lg"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              className="block text-sm font-medium text-ink"
              htmlFor="wms-flock"
            >
              Flock
            </label>
            <select
              id="wms-flock"
              value={form.flockId}
              onChange={(event) =>
                setForm({ ...form, flockId: event.target.value })
              }
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
            >
              <option value="">Chọn flock</option>
              {flocks.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="block text-sm font-medium text-ink"
              htmlFor="wms-product"
            >
              Sản phẩm
            </label>
            <select
              id="wms-product"
              value={form.productId}
              onChange={(event) =>
                setForm({ ...form, productId: event.target.value })
              }
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
            >
              <option value="">Chọn sản phẩm</option>
              {products.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              className="block text-sm font-medium text-ink"
              htmlFor="wms-type"
            >
              Loại giao dịch
            </label>
            <select
              id="wms-type"
              value={form.txnType}
              onChange={(event) =>
                setForm({ ...form, txnType: event.target.value as TxnType })
              }
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
            >
              {TXN_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Số lượng"
            type="number"
            value={String(form.quantity || "")}
            onChange={(event) =>
              setForm({ ...form, quantity: Number(event.target.value || 0) })
            }
            min={1}
            required
          />
        </div>
        {reasonRequired ? (
          <div>
            <label
              className="block text-sm font-medium text-ink"
              htmlFor="wms-reason"
            >
              Lý do (bắt buộc)
            </label>
            <textarea
              id="wms-reason"
              value={form.reason}
              onChange={(event) =>
                setForm({ ...form, reason: event.target.value })
              }
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
              rows={2}
            />
          </div>
        ) : null}
        <div>
          <label
            className="block text-sm font-medium text-ink"
            htmlFor="wms-note"
          >
            Ghi chú
          </label>
          <textarea
            id="wms-note"
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
            className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
            rows={2}
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={closeAndReset}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
          >
            Tạo giao dịch
          </Button>
        </div>
      </div>
    </Modal>
  );
}
