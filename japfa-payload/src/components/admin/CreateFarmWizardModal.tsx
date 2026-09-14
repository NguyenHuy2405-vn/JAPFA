"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFarmAction } from "@/app/actions/admin/farm";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

type Step = 1 | 2 | 3;

const initialForm = {
  farmCode: "",
  farmName: "",
  farmType: "FARM",
  address: "",
  phone: "",
  adminEmail: "",
  adminFullName: "",
  adminPhone: "",
};

type CreateFarmResult = {
  tempPassword: string;
};

export function CreateFarmWizardModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<CreateFarmResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setStep(1);
    setForm(initialForm);
    setResult(null);
    setError("");
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    const response = await createFarmAction(form);
    setLoading(false);

    if (response.success) {
      setResult({ tempPassword: response.data.tempPassword });
      setStep(3);
      router.refresh();
      return;
    }

    setError(response.message || "Có lỗi xảy ra.");
  };

  return (
    <Modal open={open} onClose={handleClose} title="Tạo Farm mới" size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink-soft">Bước {step}/3</p>
          <div className="flex gap-1" aria-hidden="true">
            {[1, 2, 3].map((value) => (
              <span
                key={value}
                className={`h-2 w-8 rounded-sm ${value <= step ? "bg-primary" : "bg-background-soft"}`}
              />
            ))}
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-3">
            <Input
              label="Mã Farm"
              required
              value={form.farmCode}
              onChange={(event) =>
                setForm({ ...form, farmCode: event.target.value.toUpperCase() })
              }
              placeholder="VD: FARM-BD-01"
            />
            <Input
              label="Tên Farm"
              required
              value={form.farmName}
              onChange={(event) =>
                setForm({ ...form, farmName: event.target.value })
              }
              placeholder="VD: Japfa Farm Bình Dương"
            />
            <div>
              <label
                className="block text-sm font-medium text-ink"
                htmlFor="farm-type"
              >
                Loại Farm
              </label>
              <select
                id="farm-type"
                value={form.farmType}
                onChange={(event) =>
                  setForm({ ...form, farmType: event.target.value })
                }
                className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="FARM">Trang trại</option>
                <option value="FACTORY">Nhà máy</option>
              </select>
            </div>
            <Input
              label="Địa chỉ"
              value={form.address}
              onChange={(event) =>
                setForm({ ...form, address: event.target.value })
              }
            />
            <Input
              label="Số điện thoại"
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <p className="rounded-md border border-line bg-background-soft p-3 text-sm text-ink-soft">
              Tài khoản quản lý Farm sẽ được tạo với role FARM và mật khẩu tạm.
            </p>
            <Input
              label="Email quản lý"
              required
              type="email"
              value={form.adminEmail}
              onChange={(event) =>
                setForm({ ...form, adminEmail: event.target.value })
              }
            />
            <Input
              label="Họ và tên"
              required
              value={form.adminFullName}
              onChange={(event) =>
                setForm({ ...form, adminFullName: event.target.value })
              }
            />
            <Input
              label="Số điện thoại"
              value={form.adminPhone}
              onChange={(event) =>
                setForm({ ...form, adminPhone: event.target.value })
              }
            />
            {error ? (
              <p className="text-sm font-medium text-ink">{error}</p>
            ) : null}
          </div>
        ) : null}

        {step === 3 && result ? (
          <div className="rounded-md border border-line bg-background-soft p-4">
            <p className="font-semibold text-ink">Tạo Farm thành công</p>
            <p className="mt-2 text-sm text-ink-soft">Mật khẩu tạm</p>
            <code className="mt-1 block rounded-md border border-line bg-surface px-3 py-2 font-mono text-sm text-ink">
              {result.tempPassword}
            </code>
            <p className="mt-2 text-xs text-ink-soft">
              Mật khẩu chỉ hiển thị một lần. Gửi cho quản lý Farm qua kênh bảo
              mật.
            </p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          {step === 1 ? (
            <>
              <Button variant="secondary" onClick={handleClose}>
                Hủy
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!form.farmCode || !form.farmName}
              >
                Tiếp tục
              </Button>
            </>
          ) : null}
          {step === 2 ? (
            <>
              <Button variant="secondary" onClick={() => setStep(1)}>
                Quay lại
              </Button>
              <Button
                onClick={handleSubmit}
                loading={loading}
                disabled={!form.adminEmail || !form.adminFullName}
              >
                Tạo Farm
              </Button>
            </>
          ) : null}
          {step === 3 ? <Button onClick={handleClose}>Đóng</Button> : null}
        </div>
      </div>
    </Modal>
  );
}
