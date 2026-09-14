"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOperationUserAction } from "@/app/actions/admin/user";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

const initialForm = { email: "", fullName: "", phone: "" };

export function CreateOperationUserModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setForm(initialForm);
    setTempPassword(null);
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
    const response = await createOperationUserAction(form);
    setLoading(false);

    if (response.success) {
      setTempPassword(response.data.tempPassword);
      router.refresh();
      return;
    }

    setError(response.message || "Có lỗi xảy ra.");
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Tạo OPERATION user"
      size="md"
    >
      {tempPassword ? (
        <div className="space-y-4">
          <div className="rounded-md border border-line bg-background-soft p-4">
            <p className="font-semibold text-ink">Tạo user thành công</p>
            <p className="mt-2 text-sm text-ink-soft">Mật khẩu tạm</p>
            <code className="mt-1 block rounded-md border border-line bg-surface px-3 py-2 font-mono text-sm text-ink">
              {tempPassword}
            </code>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleClose}>Đóng</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label="Email"
            required
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
          />
          <Input
            label="Họ và tên"
            required
            value={form.fullName}
            onChange={(event) =>
              setForm({ ...form, fullName: event.target.value })
            }
          />
          <Input
            label="Số điện thoại"
            value={form.phone}
            onChange={(event) =>
              setForm({ ...form, phone: event.target.value })
            }
          />
          {error ? (
            <p className="text-sm font-medium text-ink">{error}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              loading={loading}
              disabled={!form.email || !form.fullName}
            >
              Tạo user
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
