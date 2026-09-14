"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/formatters";
import { CreateFlockModal } from "./CreateFlockModal";

type FlockRow = {
  id: string | number;
  flockId: string;
  flockName?: string | null;
  chickenType: string;
  startDate: string;
  initialBirdCount: number;
};

export function FarmFlocksClient({
  initialFlocks,
}: {
  initialFlocks: FlockRow[];
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink">
            Quản lý đàn gà
          </h1>
          <p className="text-sm text-ink-soft">
            {initialFlocks.length} đàn gà.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Tạo đàn mới</Button>
      </div>

      {initialFlocks.length === 0 ? (
        <EmptyState
          icon="🐔"
          title="Chưa có đàn gà"
          message="Tạo đàn đầu tiên để sử dụng WMS và FMS hiệu quả hơn."
          action={
            <Button onClick={() => setShowCreate(true)}>Tạo đàn mới</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {initialFlocks.map((flock) => (
            <article
              key={String(flock.id)}
              className="rounded-md border border-line bg-surface p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">
                    {flock.flockName || flock.flockId}
                  </p>
                  <p className="text-xs text-ink-soft">{flock.flockId}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-ink-soft">Loại gà:</span>{" "}
                  {flock.chickenType}
                </p>
                <p>
                  <span className="text-ink-soft">Ngày vào đàn:</span>{" "}
                  {formatDate(flock.startDate)}
                </p>
                <p>
                  <span className="text-ink-soft">Số lượng ban đầu:</span>{" "}
                  {flock.initialBirdCount}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      <CreateFlockModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
