"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { rejectTransferAction } from "@/app/actions/operation/transfer";

type TransferItem = {
  id: string | number;
  transferId: string;
};

const REJECT_REASONS = [
  "Không đủ tồn kho",
  "Điểm nhận chưa sẵn sàng",
  "Thông tin lệnh không hợp lệ",
  "Khác",
];

export function RejectTransferModal({
  transfer,
  open,
  onClose,
}: {
  transfer: TransferItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const finalReason = useMemo(
    () => (reason === "Khác" ? note.trim() : reason),
    [reason, note],
  );

  const handleSubmit = async () => {
    if (!transfer) return;

    if (!finalReason || finalReason.length < 3) {
      setError("Vui lòng nhập lý do từ chối tối thiểu 3 ký tự.");
      return;
    }

    setLoading(true);
    setError("");
    const res = await rejectTransferAction(transfer.id, finalReason);
    setLoading(false);

    if (res.success) {
      router.refresh();
      onClose();
      return;
    }

    setError(res.message || "Có lỗi xảy ra.");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Từ chối lệnh điều chuyển"
      size="md"
    >
      {transfer && (
        <div className="space-y-4">
          <div className="rounded-md border border-line bg-background-soft p-3">
            <p className="text-sm">
              <strong>Mã lệnh:</strong> {transfer.transferId}
            </p>
          </div>
          <div>
            <label
              className="block text-sm font-medium text-ink"
              htmlFor="transfer-reject-reason"
            >
              Lý do từ chối
            </label>
            <select
              id="transfer-reject-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
              aria-label="Lý do từ chối lệnh điều chuyển"
            >
              {REJECT_REASONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          {reason === "Khác" ? (
            <Input
              label="Ghi chú lý do"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nhập lý do cụ thể..."
              aria-label="Ghi chú lý do từ chối"
            />
          ) : null}
          <p className="text-xs text-ink-soft">
            Lý do sẽ được gửi cho các bên liên quan qua notification.
          </p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleSubmit} loading={loading}>
              Xác nhận từ chối
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
