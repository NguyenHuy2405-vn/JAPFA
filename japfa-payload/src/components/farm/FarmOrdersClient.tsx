"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelOrderAction,
  receiveOrderAction,
  submitOrderAction,
} from "@/app/actions/farm/order";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/formatters";
import { CreateOrderModal } from "./CreateOrderModal";

type Option = { id: string | number; label: string };

type RelationValue = { name?: string } | string | number | null | undefined;

type OrderRow = {
  id: string | number;
  orderId: string;
  status: string;
  quantity: number;
  createdAt: string;
  client?: string;
  origin?: RelationValue;
  destination?: RelationValue;
  product?: RelationValue;
};

type ActionKind = "submit" | "cancel" | "receive";

const TABS = [
  "ALL",
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "IN_TRANSIT",
  "RECEIVED",
  "COMPLETED",
] as const;

const extractName = (value: RelationValue) =>
  typeof value === "object" && value?.name
    ? value.name
    : typeof value === "string"
      ? value
      : "-";

export function FarmOrdersClient({
  initialOrders,
  origins,
  destinations,
  products,
  flocks,
}: {
  initialOrders: OrderRow[];
  origins: Option[];
  destinations: Option[];
  products: Option[];
  flocks: Option[];
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState<string | number | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("ALL");
  const [confirmAction, setConfirmAction] = useState<{
    order: OrderRow;
    action: ActionKind;
  } | null>(null);
  const [message, setMessage] = useState("");

  const filtered = useMemo(
    () =>
      activeTab === "ALL"
        ? initialOrders
        : initialOrders.filter((order) => order.status === activeTab),
    [activeTab, initialOrders],
  );

  const actionLabel = (action: ActionKind) => {
    if (action === "submit") return "gửi duyệt";
    if (action === "cancel") return "hủy đơn";
    return "xác nhận nhận hàng";
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    const { order, action } = confirmAction;

    setLoading(order.id);
    setMessage("");
    let response;

    if (action === "submit") response = await submitOrderAction(order.id);
    else if (action === "cancel") response = await cancelOrderAction(order.id);
    else response = await receiveOrderAction(order.id);

    setLoading(null);
    setConfirmAction(null);

    if (response.success) {
      router.refresh();
      return;
    }

    setMessage(response.message || "Có lỗi xảy ra.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink">
            Đơn hàng của tôi
          </h1>
          <p className="text-sm text-ink-soft">
            {initialOrders.length} đơn hàng trong phạm vi farm.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Tạo đơn mới</Button>
      </div>

      {message ? (
        <p className="rounded-md border border-line bg-background-soft px-3 py-2 text-sm text-ink">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={
              activeTab === tab
                ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-md bg-background-soft px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface"
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📝"
          title="Chưa có đơn hàng nào"
          message="Bắt đầu tạo đơn hàng đầu tiên."
          action={
            <Button onClick={() => setShowCreate(true)}>Tạo đơn mới</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((order) => (
            <article
              key={String(order.id)}
              className="rounded-md border border-line bg-surface p-4 shadow-card"
            >
              <div className="flex items-start justify-between">
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
                  <span className="text-ink-soft">Nơi đi:</span>{" "}
                  {extractName(order.origin)}
                </p>
                <p>
                  <span className="text-ink-soft">Nơi đến:</span>{" "}
                  {extractName(order.destination)}
                </p>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                {order.status === "DRAFT" ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setConfirmAction({ order, action: "cancel" })
                      }
                      loading={loading === order.id}
                    >
                      Hủy
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        setConfirmAction({ order, action: "submit" })
                      }
                      loading={loading === order.id}
                    >
                      Gửi duyệt
                    </Button>
                  </>
                ) : null}
                {order.status === "IN_TRANSIT" ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      setConfirmAction({ order, action: "receive" })
                    }
                    loading={loading === order.id}
                  >
                    Nhận hàng
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <CreateOrderModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        origins={origins}
        destinations={destinations}
        products={products}
        flocks={flocks}
      />

      <Modal
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        title="Xác nhận thao tác"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            {confirmAction
              ? `Bạn có chắc muốn ${actionLabel(confirmAction.action)} cho đơn ${confirmAction.order.orderId}?`
              : ""}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>
              Hủy
            </Button>
            <Button onClick={handleAction}>Xác nhận</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
