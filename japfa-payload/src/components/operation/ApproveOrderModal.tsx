"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { approveOrderAction } from "@/app/actions/operation/order";

type OrderItem = {
  id: string | number;
  orderId: string;
  quantity: number;
  product?: { name?: string } | string | number | null;
};

export function ApproveOrderModal({
  order,
  open,
  onClose,
}: {
  order: OrderItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!order) return;
    setLoading(true);
    setError("");
    const res = await approveOrderAction(order.id);
    setLoading(false);

    if (res.success) {
      router.refresh();
      onClose();
      return;
    }

    setError(res.message || "Có lỗi xảy ra.");
  };

  const productName =
    typeof order?.product === "object" && order?.product?.name
      ? order.product.name
      : undefined;

  return (
    <Modal open={open} onClose={onClose} title="Duyệt đơn hàng" size="sm">
      {order && (
        <div className="space-y-4">
          <div className="rounded-md border border-line bg-background-soft p-3">
            <p className="text-sm">
              <strong>Mã đơn:</strong> {order.orderId}
            </p>
            <p className="text-sm">
              <strong>Số lượng:</strong> {order.quantity}
            </p>
            {productName ? (
              <p className="text-sm">
                <strong>Sản phẩm:</strong> {productName}
              </p>
            ) : null}
          </div>
          <p className="text-sm text-ink-soft">
            Sau khi duyệt, hệ thống sẽ tự động:
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-ink-soft">
            <li>Chuyển trạng thái sang APPROVED</li>
            <li>Gửi thông báo cho Farm đặt đơn</li>
            <li>Ghi audit log ORDER_APPROVED</li>
          </ul>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} loading={loading}>
              Xác nhận duyệt
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
