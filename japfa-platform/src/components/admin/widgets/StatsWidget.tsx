import React from 'react';

type StatsProps = {
  stats: {
    farms: number;
    users: number;
    ordersPending: number;
  };
};

export function StatsWidget({ stats }: StatsProps) {
  const items = [
    { label: 'Tổng Trang Trại', value: stats.farms, icon: '🏢' },
    { label: 'Tổng Tài Khoản', value: stats.users, icon: '👥' },
    { label: 'Đơn Hàng Chờ Duyệt', value: stats.ordersPending, icon: '📋' },
  ];

  return (
    <div className="col-span-full rounded-md border border-line bg-surface p-6 shadow-card">
      <h2 className="mb-4 text-base font-semibold text-ink">Tổng quan vận hành</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-4 rounded-md border border-line bg-surface-subtle p-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-lg">
              {item.icon}
            </div>
            <div>
              <p className="text-xs text-ink-soft">{item.label}</p>
              <p className="text-xl font-bold text-ink">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
