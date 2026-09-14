"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createTransferAction } from "@/app/actions/farm/transfer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

type Option = { id: string | number; label: string };

type FormState = {
  toTenantId: string;
  productId: string;
  quantity: number;
  uom: string;
  note: string;
  flockId: string;
};

const initialState: FormState = {
  toTenantId: "",
  productId: "",
  quantity: 0,
  uom: "Bao",
  note: "",
  flockId: "",
};

export function CreateTransferModal({
  open,
  onClose,
  destinations,
  products,
  flocks,
}: {
  open: boolean;
  onClose: () => void;
  destinations: Option[];
  products: Option[];
  flocks: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () => form.toTenantId && form.productId && form.quantity > 0,
    [form],
  );

  const closeAndReset = () => {
    setForm(initialState);
    setError("");
    setLoading(false);
    onClose();
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    const response = await createTransferAction({
      toTenantId: form.toTenantId,
      productId: form.productId,
      quantity: Number(form.quantity),
      uom: form.uom,
      note: form.note || undefined,
      flockId: form.flockId || undefined,
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
      title="Tạo lệnh điều chuyển"
      size="lg"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              className="block text-sm font-medium text-ink"
              htmlFor="transfer-destination"
            >
              Nơi nhận
            </label>
            <select
              id="transfer-destination"
              value={form.toTenantId}
              onChange={(event) =>
                setForm({ ...form, toTenantId: event.target.value })
              }
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
            >
              <option value="">Chọn nơi nhận</option>
              {destinations.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="block text-sm font-medium text-ink"
              htmlFor="transfer-product"
            >
              Sản phẩm
            </label>
            <select
              id="transfer-product"
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
          <Input
            label="Đơn vị tính"
            value={form.uom}
            onChange={(event) => setForm({ ...form, uom: event.target.value })}
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium text-ink"
            htmlFor="transfer-flock"
          >
            Flock (tuỳ chọn)
          </label>
          <select
            id="transfer-flock"
            value={form.flockId}
            onChange={(event) =>
              setForm({ ...form, flockId: event.target.value })
            }
            className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="">Không chọn</option>
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
            htmlFor="transfer-note"
          >
            Ghi chú
          </label>
          <textarea
            id="transfer-note"
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
            className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
            rows={3}
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
            Tạo lệnh
          </Button>
        </div>
      </div>
    </Modal>
  );
}
