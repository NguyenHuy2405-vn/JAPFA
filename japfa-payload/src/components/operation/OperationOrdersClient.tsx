"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/Button";
import { ApproveOrderModal } from "./ApproveOrderModal";
import { RejectOrderModal } from "./RejectOrderModal";

type RelationValue = { name?: string } | string | number | null | undefined;

type OrderItem = {
  id: string | number;
  orderId: string;
  client?: string;
  quantity: number;
  status: string;
  createdAt: string;
  tenant?: RelationValue;
  origin?: RelationValue;
  destination?: RelationValue;
  product?: RelationValue;
};

const extractName = (value: RelationValue) =>
  typeof value === "object" && value?.name
    ? value.name
    : typeof value === "string"
      ? value
      : "-";

export function OperationOrdersClient({
  initialOrders,
  mode,
}: {
  initialOrders: OrderItem[];
  mode: "pending" | "in-transit";
}) {
  const [selectedApprove, setSelectedApprove] = useState<OrderItem | null>(
    null,
  );
  const [selectedReject, setSelectedReject] = useState<OrderItem | null>(null);

  const title = useMemo(
    () =>
      mode === "pending"
        ? "Không có đơn hàng nào"
        : "Không có đơn đang vận chuyển",
    [mode],
  );

  const message = useMemo(
    () =>
      mode === "pending"
        ? "Chưa có đơn hàng nào cần xử lý."
        : "Chưa có đơn hàng nào ở trạng thái IN_TRANSIT.",
    [mode],
  );

  if (initialOrders.length === 0) {
    return <EmptyState icon="📝" title={title} message={message} />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {initialOrders.map((order) => (
          <div
            key={String(order.id)}
            className="rounded-md border border-line bg-surface p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-ink">{order.orderId}</p>
                <p className="text-xs text-ink-soft">
                  {formatDate(order.createdAt)}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <div className="mt-3 space-y-1 text-sm">
              <p>
                <span className="text-ink-soft">Khách hàng:</span>{" "}
                {order.client || "-"}
              </p>
              <p>
                <span className="text-ink-soft">Sản phẩm:</span>{" "}
                {extractName(order.product)}
              </p>
              <p>
                <span className="text-ink-soft">Số lượng:</span>{" "}
                <strong>{order.quantity}</strong>
              </p>
              <p>
                <span className="text-ink-soft">Từ:</span>{" "}
                {extractName(order.origin)}
              </p>
              <p>
                <span className="text-ink-soft">Đến:</span>{" "}
                {extractName(order.destination)}
              </p>
            </div>

            {mode === "pending" ? (
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedReject(order)}
                  aria-label={`Từ chối đơn ${order.orderId}`}
                >
                  Từ chối
                </Button>
                <Button
                  size="sm"
                  onClick={() => setSelectedApprove(order)}
                  aria-label={`Duyệt đơn ${order.orderId}`}
                >
                  Duyệt
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <ApproveOrderModal
        order={selectedApprove}
        open={Boolean(selectedApprove)}
        onClose={() => setSelectedApprove(null)}
      />
      <RejectOrderModal
        order={selectedReject}
        open={Boolean(selectedReject)}
        onClose={() => setSelectedReject(null)}
      />
    </div>
  );
}
