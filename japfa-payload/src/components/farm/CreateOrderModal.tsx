"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createOrderAction } from "@/app/actions/farm/order";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

type Option = { id: string | number; label: string };

type FormState = {
  client: string;
  originId: string;
  destinationId: string;
  productId: string;
  quantity: number;
  uom: string;
  note: string;
  flockId: string;
};

const initialState: FormState = {
  client: "",
  originId: "",
  destinationId: "",
  productId: "",
  quantity: 0,
  uom: "Bao",
  note: "",
  flockId: "",
};

export function CreateOrderModal({
  open,
  onClose,
  origins,
  destinations,
  products,
  flocks,
}: {
  open: boolean;
  onClose: () => void;
  origins: Option[];
  destinations: Option[];
  products: Option[];
  flocks: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isReady = useMemo(
    () =>
      form.client.trim().length >= 2 &&
      form.originId &&
      form.destinationId &&
      form.productId &&
      form.quantity > 0,
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
    const response = await createOrderAction({
      client: form.client,
      originId: form.originId,
      destinationId: form.destinationId,
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
      title="Tạo đơn hàng mới"
      size="lg"
    >
      <div className="space-y-3">
        <Input
          label="Khách hàng"
          value={form.client}
          onChange={(event) => setForm({ ...form, client: event.target.value })}
          required
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              className="block text-sm font-medium text-ink"
              htmlFor="order-origin"
            >
              Nơi đi
            </label>
            <select
              id="order-origin"
              value={form.originId}
              onChange={(event) =>
                setForm({ ...form, originId: event.target.value })
              }
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
              aria-label="Nơi đi"
            >
              <option value="">Chọn nơi đi</option>
              {origins.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="block text-sm font-medium text-ink"
              htmlFor="order-destination"
            >
              Nơi đến
            </label>
            <select
              id="order-destination"
              value={form.destinationId}
              onChange={(event) =>
                setForm({ ...form, destinationId: event.target.value })
              }
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
              aria-label="Nơi đến"
            >
              <option value="">Chọn nơi đến</option>
              {destinations.map((item) => (
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
              htmlFor="order-product"
            >
              Sản phẩm
            </label>
            <select
              id="order-product"
              value={form.productId}
              onChange={(event) =>
                setForm({ ...form, productId: event.target.value })
              }
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
              aria-label="Sản phẩm"
            >
              <option value="">Chọn sản phẩm</option>
              {products.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.label}
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
            required
            min={1}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Đơn vị tính"
            value={form.uom}
            onChange={(event) => setForm({ ...form, uom: event.target.value })}
          />
          <div>
            <label
              className="block text-sm font-medium text-ink"
              htmlFor="order-flock"
            >
              Flock (tuỳ chọn)
            </label>
            <select
              id="order-flock"
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
        </div>
        <div>
          <label
            className="block text-sm font-medium text-ink"
            htmlFor="order-note"
          >
            Ghi chú
          </label>
          <textarea
            id="order-note"
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
          <Button onClick={handleSubmit} loading={loading} disabled={!isReady}>
            Tạo đơn
          </Button>
        </div>
      </div>
    </Modal>
  );
}
