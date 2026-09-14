"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createFmsLogAction } from "@/app/actions/farm/fms";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

type Option = { id: string | number; label: string };

type FormState = {
  flockId: string;
  date: string;
  ageInDays: number;
  endQty: number;
  mortality: number;
  feedQty: number;
  avgWeight: number;
  note: string;
};

const initialState: FormState = {
  flockId: "",
  date: new Date().toISOString().slice(0, 10),
  ageInDays: 0,
  endQty: 0,
  mortality: 0,
  feedQty: 0,
  avgWeight: 0,
  note: "",
};

export function CreateFmsLogModal({
  open,
  onClose,
  flocks,
}: {
  open: boolean;
  onClose: () => void;
  flocks: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () =>
      Boolean(
        form.flockId && form.date && form.ageInDays >= 0 && form.endQty >= 0,
      ),
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

    const response = await createFmsLogAction({
      flockId: form.flockId,
      date: form.date,
      ageInDays: Number(form.ageInDays),
      endQty: Number(form.endQty),
      mortality: Number(form.mortality) || undefined,
      feedQty: Number(form.feedQty) || undefined,
      avgWeight: Number(form.avgWeight) || undefined,
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
      title="Tạo nhật ký FMS"
      size="lg"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              className="block text-sm font-medium text-ink"
              htmlFor="fms-flock"
            >
              Flock
            </label>
            <select
              id="fms-flock"
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
          <Input
            label="Ngày"
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Ngày tuổi"
            type="number"
            value={String(form.ageInDays)}
            onChange={(event) =>
              setForm({ ...form, ageInDays: Number(event.target.value || 0) })
            }
            min={0}
            required
          />
          <Input
            label="Tồn cuối kỳ"
            type="number"
            value={String(form.endQty)}
            onChange={(event) =>
              setForm({ ...form, endQty: Number(event.target.value || 0) })
            }
            min={0}
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="Mortality"
            type="number"
            value={String(form.mortality)}
            onChange={(event) =>
              setForm({ ...form, mortality: Number(event.target.value || 0) })
            }
            min={0}
          />
          <Input
            label="Feed Qty"
            type="number"
            value={String(form.feedQty)}
            onChange={(event) =>
              setForm({ ...form, feedQty: Number(event.target.value || 0) })
            }
            min={0}
          />
          <Input
            label="Avg Weight"
            type="number"
            value={String(form.avgWeight)}
            onChange={(event) =>
              setForm({ ...form, avgWeight: Number(event.target.value || 0) })
            }
            min={0}
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium text-ink"
            htmlFor="fms-note"
          >
            Ghi chú
          </label>
          <textarea
            id="fms-note"
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
            Tạo log
          </Button>
        </div>
      </div>
    </Modal>
  );
}
