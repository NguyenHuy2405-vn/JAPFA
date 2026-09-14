"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelTransferAction,
  receiveTransferAction,
  submitTransferAction,
} from "@/app/actions/farm/transfer";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/formatters";
import { CreateTransferModal } from "./CreateTransferModal";

type Option = { id: string | number; label: string };
type RelationValue = { name?: string } | string | number | null | undefined;
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

type TransferRow = {
  id: string | number;
  transferId: string;
  status: string;
  quantity: number;
  createdAt: string;
  fromTenant?: RelationValue;
  toTenant?: RelationValue;
  product?: RelationValue;
};

const extractName = (value: RelationValue) =>
  typeof value === "object" && value?.name
    ? value.name
    : typeof value === "string"
      ? value
      : "-";

export function FarmTransfersClient({
  initialTransfers,
  destinations,
  products,
  flocks,
}: {
  initialTransfers: TransferRow[];
  destinations: Option[];
  products: Option[];
  flocks: Option[];
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState<string | number | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("ALL");
  const [confirmAction, setConfirmAction] = useState<{
    transfer: TransferRow;
    action: ActionKind;
  } | null>(null);
  const [message, setMessage] = useState("");

  const filtered = useMemo(
    () =>
      activeTab === "ALL"
        ? initialTransfers
        : initialTransfers.filter((item) => item.status === activeTab),
    [activeTab, initialTransfers],
  );

  const actionLabel = (action: ActionKind) => {
    if (action === "submit") return "gửi duyệt";
    if (action === "cancel") return "hủy lệnh";
    return "xác nhận nhận hàng";
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    const { transfer, action } = confirmAction;

    setLoading(transfer.id);
    setMessage("");
    let response;

    if (action === "submit") response = await submitTransferAction(transfer.id);
    else if (action === "cancel")
      response = await cancelTransferAction(transfer.id);
    else response = await receiveTransferAction(transfer.id);

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
            Điều chuyển của tôi
          </h1>
          <p className="text-sm text-ink-soft">
            {initialTransfers.length} lệnh trong phạm vi farm.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Tạo điều chuyển</Button>
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
          icon="🚚"
          title="Chưa có lệnh điều chuyển"
          message="Bắt đầu tạo lệnh điều chuyển đầu tiên."
          action={
            <Button onClick={() => setShowCreate(true)}>Tạo điều chuyển</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((item) => (
            <article
              key={String(item.id)}
              className="rounded-md border border-line bg-surface p-4 shadow-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-ink">{item.transferId}</p>
                  <p className="text-xs text-ink-soft">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <p>
                  <span className="text-ink-soft">Sản phẩm:</span>{" "}
                  {extractName(item.product)}
                </p>
                <p>
                  <span className="text-ink-soft">Số lượng:</span>{" "}
                  <strong>{item.quantity}</strong>
                </p>
                <p>
                  <span className="text-ink-soft">Nơi gửi:</span>{" "}
                  {extractName(item.fromTenant)}
                </p>
                <p>
                  <span className="text-ink-soft">Nơi nhận:</span>{" "}
                  {extractName(item.toTenant)}
                </p>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                {item.status === "DRAFT" ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setConfirmAction({ transfer: item, action: "cancel" })
                      }
                      loading={loading === item.id}
                    >
                      Hủy
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        setConfirmAction({ transfer: item, action: "submit" })
                      }
                      loading={loading === item.id}
                    >
                      Gửi duyệt
                    </Button>
                  </>
                ) : null}
                {item.status === "IN_TRANSIT" ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      setConfirmAction({ transfer: item, action: "receive" })
                    }
                    loading={loading === item.id}
                  >
                    Nhận hàng
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <CreateTransferModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
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
              ? `Bạn có chắc muốn ${actionLabel(confirmAction.action)} cho lệnh ${confirmAction.transfer.transferId}?`
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
