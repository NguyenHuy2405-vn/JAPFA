"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
import { formatDateTime } from "@/lib/formatters";

export type AdminAuditLogRow = {
  id: string | number;
  action: string;
  actorEmail: string;
  actorRole: string;
  targetCollection: string;
  targetId: string;
  ip: string;
  timestamp: string;
};

export function AdminAuditLogsClient({
  initialLogs,
  initialTotalDocs,
}: {
  initialLogs: AdminAuditLogRow[];
  initialTotalDocs: number;
}) {
  const [filter, setFilter] = useState({ action: "", search: "" });

  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      const action = filter.action.trim().toLowerCase();
      if (action && !log.action.toLowerCase().includes(action)) return false;

      const search = filter.search.trim().toLowerCase();
      if (search) {
        const haystack =
          `${log.actorEmail} ${log.actorRole} ${log.targetCollection} ${log.targetId}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }, [filter, initialLogs]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ink">
          Audit Logs
        </h1>
        <p className="text-sm text-ink-soft">
          Lịch sử hành động nhạy cảm trong hệ thống. Tổng: {initialTotalDocs}{" "}
          bản ghi.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          aria-label="Lọc theo action"
          type="search"
          placeholder="Lọc theo action..."
          value={filter.action}
          onChange={(event) =>
            setFilter({ ...filter, action: event.target.value })
          }
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <input
          aria-label="Tìm actor hoặc target"
          type="search"
          placeholder="Tìm actor, role hoặc target..."
          value={filter.search}
          onChange={(event) =>
            setFilter({ ...filter, search: event.target.value })
          }
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {filteredLogs.length === 0 ? (
        <EmptyState
          title="Chưa có audit log phù hợp"
          message="Các hành động nhạy cảm sẽ được ghi lại ở đây."
        />
      ) : (
        <Table headers={["Thời gian", "Actor", "Hành động", "Target", "IP"]}>
          {filteredLogs.map((log) => (
            <tr
              key={log.id}
              className="border-b border-line-soft last:border-0 hover:bg-background-soft"
            >
              <td className="px-4 py-3 text-xs text-ink-soft">
                {formatDateTime(log.timestamp)}
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-ink">{log.actorEmail}</p>
                <p className="text-xs text-ink-soft">{log.actorRole}</p>
              </td>
              <td className="px-4 py-3 text-sm text-ink">{log.action}</td>
              <td className="px-4 py-3 text-xs text-ink-soft">
                {log.targetCollection}:{log.targetId}
              </td>
              <td className="px-4 py-3 text-xs text-ink-soft">
                {log.ip || "-"}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
