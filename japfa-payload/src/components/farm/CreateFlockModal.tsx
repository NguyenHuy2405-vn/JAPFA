"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFlockAction } from "@/app/actions/farm/flock";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

type FormState = {
  flockId: string;
  flockName: string;
  chickenType: string;
  startDate: string;
  initialBirdCount: number;
  sourceFlockGroup: string;
  standardsApplied: string;
};

const initialState: FormState = {
  flockId: "",
  flockName: "",
  chickenType: "",
  startDate: new Date().toISOString().slice(0, 10),
  initialBirdCount: 0,
  sourceFlockGroup: "",
  standardsApplied: "",
};

export function CreateFlockModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const closeAndReset = () => {
    setForm(initialState);
    setError("");
    setLoading(false);
    onClose();
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    const response = await createFlockAction({
      flockId: form.flockId,
      flockName: form.flockName || undefined,
      chickenType: form.chickenType,
      startDate: form.startDate,
      initialBirdCount: Number(form.initialBirdCount),
      sourceFlockGroup: form.sourceFlockGroup || undefined,
      standardsApplied: form.standardsApplied || undefined,
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
    <Modal open={open} onClose={closeAndReset} title="Tạo đàn gà mới" size="lg">
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Mã đàn"
            required
            value={form.flockId}
            onChange={(event) =>
              setForm({ ...form, flockId: event.target.value })
            }
            placeholder="VD: CKMN0545/0004"
          />
          <Input
            label="Tên đàn"
            value={form.flockName}
            onChange={(event) =>
              setForm({ ...form, flockName: event.target.value })
            }
            placeholder="VD: Choi Noi Gia Lai"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Loại gà"
            required
            value={form.chickenType}
            onChange={(event) =>
              setForm({ ...form, chickenType: event.target.value })
            }
            placeholder="VD: ChoiNoi_Male_GiaLai"
          />
          <Input
            label="Ngày vào đàn"
            required
            type="date"
            value={form.startDate}
            onChange={(event) =>
              setForm({ ...form, startDate: event.target.value })
            }
          />
        </div>

        <Input
          label="Số lượng ban đầu"
          required
          type="number"
          min={1}
          value={String(form.initialBirdCount || "")}
          onChange={(event) =>
            setForm({
              ...form,
              initialBirdCount: Number(event.target.value || 0),
            })
          }
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Nhóm đàn nguồn"
            value={form.sourceFlockGroup}
            onChange={(event) =>
              setForm({ ...form, sourceFlockGroup: event.target.value })
            }
            placeholder="VD: FLOCK_11"
          />
          <Input
            label="Tiêu chuẩn áp dụng"
            value={form.standardsApplied}
            onChange={(event) =>
              setForm({ ...form, standardsApplied: event.target.value })
            }
            placeholder="VD: Japfa Standard v1"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={closeAndReset}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Tạo đàn
          </Button>
        </div>
      </div>
    </Modal>
  );
}
