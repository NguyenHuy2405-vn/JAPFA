"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/Button";
import { ApproveTransferModal } from "./ApproveTransferModal";
import { RejectTransferModal } from "./RejectTransferModal";
import { ReceiveTransferModal } from "./ReceiveTransferModal";

type RelationValue = { name?: string } | string | number | null | undefined;

type TransferItem = {
  id: string | number;
  transferId: string;
  quantity: number;
  status: string;
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

export function OperationTransfersClient({
  initialTransfers,
  mode,
}: {
  initialTransfers: TransferItem[];
  mode: "pending" | "in-transit";
}) {
  const [selectedApprove, setSelectedApprove] = useState<TransferItem | null>(
    null,
  );
  const [selectedReject, setSelectedReject] = useState<TransferItem | null>(
    null,
  );
  const [selectedReceive, setSelectedReceive] = useState<TransferItem | null>(
    null,
  );

  if (initialTransfers.length === 0) {
    return (
      <EmptyState
        icon="🚚"
        title={
          mode === "pending"
            ? "Không có lệnh chờ duyệt"
            : "Không có lệnh đang vận chuyển"
        }
        message={
          mode === "pending"
            ? "Chưa có yêu cầu điều chuyển nào cần xử lý."
            : "Chưa có lệnh điều chuyển nào ở trạng thái IN_TRANSIT."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {initialTransfers.map((transfer) => (
          <div
            key={String(transfer.id)}
            className="rounded-md border border-line bg-surface p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-ink">{transfer.transferId}</p>
                <p className="text-xs text-ink-soft">
                  {formatDate(transfer.createdAt)}
                </p>
              </div>
              <StatusBadge status={transfer.status} />
            </div>

            <div className="mt-3 space-y-1 text-sm">
              <p>
                <span className="text-ink-soft">Sản phẩm:</span>{" "}
                {extractName(transfer.product)}
              </p>
              <p>
                <span className="text-ink-soft">Số lượng:</span>{" "}
                <strong>{transfer.quantity}</strong>
              </p>
              <p>
                <span className="text-ink-soft">Nơi gửi:</span>{" "}
                {extractName(transfer.fromTenant)}
              </p>
              <p>
                <span className="text-ink-soft">Nơi nhận:</span>{" "}
                {extractName(transfer.toTenant)}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {mode === "pending" ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedReject(transfer)}
                    aria-label={`Từ chối lệnh ${transfer.transferId}`}
                  >
                    Từ chối
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setSelectedApprove(transfer)}
                    aria-label={`Duyệt lệnh ${transfer.transferId}`}
                  >
                    Duyệt
                  </Button>
                </>
              ) : null}
              {mode === "in-transit" ? (
                <Button
                  size="sm"
                  onClick={() => setSelectedReceive(transfer)}
                  aria-label={`Xác nhận nhận lệnh ${transfer.transferId}`}
                >
                  Xác nhận nhận hàng
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <ApproveTransferModal
        transfer={selectedApprove}
        open={Boolean(selectedApprove)}
        onClose={() => setSelectedApprove(null)}
      />
      <RejectTransferModal
        transfer={selectedReject}
        open={Boolean(selectedReject)}
        onClose={() => setSelectedReject(null)}
      />
      <ReceiveTransferModal
        transfer={selectedReceive}
        open={Boolean(selectedReceive)}
        onClose={() => setSelectedReceive(null)}
      />
    </div>
  );
}
