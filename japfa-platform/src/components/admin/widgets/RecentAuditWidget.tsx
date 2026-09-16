import React from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function RecentAuditWidget() {
  const payload = await getPayload({ config });

  const logs = await payload.find({
    collection: 'audit-logs',
    limit: 5,
    sort: '-timestamp',
    depth: 0,
    overrideAccess: true,
  });

  return (
    <div className="rounded-md border border-line bg-surface p-6 shadow-card">
      <h2 className="mb-4 text-base font-semibold text-ink">Nhật ký hoạt động</h2>
      {logs.docs.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-soft">
          Chưa có hoạt động hệ thống
        </p>
      ) : (
        <ul className="space-y-2">
          {logs.docs.map((log: any) => (
            <li
              key={log.id}
              className="flex items-center justify-between rounded-md border border-line-soft bg-surface-subtle p-3"
            >
              <div>
                <p className="text-sm font-medium text-ink">{log.action}</p>
                <p className="text-xs text-ink-soft">{log.actorEmail}</p>
              </div>
              <span className="text-xs text-ink-muted">
                {new Date(log.timestamp).toLocaleString('vi-VN')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
