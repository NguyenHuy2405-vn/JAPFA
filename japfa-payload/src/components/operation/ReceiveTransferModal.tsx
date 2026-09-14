"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { receiveTransferAction } from "@/app/actions/operation/transfer";

type TransferItem = {
  id: string | number;
  transferId: string;
};

export function ReceiveTransferModal({
  transfer,
  open,
  onClose,
}: {
  transfer: TransferItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!transfer) return;
    setLoading(true);
    setError("");
    const res = await receiveTransferAction(transfer.id);
    setLoading(false);

    if (res.success) {
      router.refresh();
      onClose();
      return;
    }

    setError(res.message || "Có lỗi xảy ra.");
  };

  return (
    <Modal open={open} onClose={onClose} title="Xác nhận nhận hàng" size="sm">
      {transfer ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            Xác nhận đã nhận hàng cho lệnh{" "}
            <strong>{transfer.transferId}</strong>?
          </p>
          <p className="text-xs text-ink-soft">
            Sau khi xác nhận, hệ thống sẽ chuyển trạng thái sang RECEIVED và gửi
            thông báo.
          </p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} loading={loading}>
              Xác nhận
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
