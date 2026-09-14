"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/formatters";
import { CreateWmsTransactionModal } from "./CreateWmsTransactionModal";

type Option = { id: string | number; label: string };
type RelationValue = { name?: string } | string | number | null | undefined;

type WmsRow = {
  id: string | number;
  txnType: string;
  quantity: number;
  date: string;
  product?: RelationValue;
  flock?: RelationValue;
  reason?: string;
};

const extractName = (value: RelationValue) =>
  typeof value === "object" && value?.name
    ? value.name
    : typeof value === "string"
      ? value
      : "-";

export function FarmWmsClient({
  initialRows,
  flocks,
  products,
}: {
  initialRows: WmsRow[];
  flocks: Option[];
  products: Option[];
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink">
            Kho WMS
          </h1>
          <p className="text-sm text-ink-soft">
            {initialRows.length} giao dịch gần nhất.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Tạo giao dịch</Button>
      </div>

      {initialRows.length === 0 ? (
        <EmptyState
          title="Chưa có giao dịch WMS"
          message="Tạo giao dịch kho đầu tiên để bắt đầu theo dõi tồn kho."
          action={
            <Button onClick={() => setShowCreate(true)}>Tạo giao dịch</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {initialRows.map((row) => (
            <article
              key={String(row.id)}
              className="rounded-md border border-line bg-surface p-4 shadow-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-ink">{row.txnType}</p>
                  <p className="text-xs text-ink-soft">
                    {formatDateTime(row.date)}
                  </p>
                </div>
                <StatusBadge status={row.txnType} />
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <p>
                  <span className="text-ink-soft">Số lượng:</span>{" "}
                  <strong>{row.quantity}</strong>
                </p>
                <p>
                  <span className="text-ink-soft">Sản phẩm:</span>{" "}
                  {extractName(row.product)}
                </p>
                <p>
                  <span className="text-ink-soft">Flock:</span>{" "}
                  {extractName(row.flock)}
                </p>
                {row.reason ? (
                  <p>
                    <span className="text-ink-soft">Lý do:</span> {row.reason}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <CreateWmsTransactionModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        flocks={flocks}
        products={products}
      />
    </div>
  );
}
