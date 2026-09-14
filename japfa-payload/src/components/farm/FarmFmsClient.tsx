"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/formatters";
import { CreateFmsLogModal } from "./CreateFmsLogModal";

type Option = { id: string | number; label: string };
type RelationValue =
  | { flockId?: string; name?: string }
  | string
  | number
  | null
  | undefined;

type FmsRow = {
  id: string | number;
  date: string;
  ageInDays: number;
  endQty: number;
  flock?: RelationValue;
  mortAct?: number;
  feedQtyAct?: number;
};

const extractFlock = (value: RelationValue) =>
  typeof value === "object" && value
    ? value.flockId || value.name || "-"
    : typeof value === "string"
      ? value
      : "-";

export function FarmFmsClient({
  initialRows,
  flocks,
}: {
  initialRows: FmsRow[];
  flocks: Option[];
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink">
            Nhật ký FMS
          </h1>
          <p className="text-sm text-ink-soft">
            {initialRows.length} bản ghi gần nhất.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Tạo nhật ký</Button>
      </div>

      {initialRows.length === 0 ? (
        <EmptyState
          title="Chưa có nhật ký FMS"
          message="Tạo bản ghi đầu tiên để theo dõi vận hành trại."
          action={
            <Button onClick={() => setShowCreate(true)}>Tạo nhật ký</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {initialRows.map((row) => (
            <article
              key={String(row.id)}
              className="rounded-md border border-line bg-surface p-4 shadow-card"
            >
              <p className="font-medium text-ink">{formatDate(row.date)}</p>
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <span className="text-ink-soft">Flock:</span>{" "}
                  {extractFlock(row.flock)}
                </p>
                <p>
                  <span className="text-ink-soft">Ngày tuổi:</span>{" "}
                  {row.ageInDays}
                </p>
                <p>
                  <span className="text-ink-soft">Tồn cuối kỳ:</span>{" "}
                  {row.endQty}
                </p>
                <p>
                  <span className="text-ink-soft">Mortality:</span>{" "}
                  {row.mortAct ?? 0}
                </p>
                <p>
                  <span className="text-ink-soft">Feed Qty:</span>{" "}
                  {row.feedQtyAct ?? 0}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      <CreateFmsLogModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        flocks={flocks}
      />
    </div>
  );
}
