import React from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';
import Link from 'next/link';

export async function OrdersPendingWidget() {
  const payload = await getPayload({ config });

  const orders = await payload.find({
    collection: 'orders',
    where: { status: { equals: 'SUBMITTED' } },
    limit: 5,
    sort: '-createdAt',
    depth: 1,
    overrideAccess: true,
  });

  return (
    <div className="rounded-md border border-line bg-surface p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Đơn hàng chờ duyệt</h2>
        <Link
          href="/payload-admin/collections/orders"
          className="text-sm font-medium text-primary hover:underline"
        >
          Xem tất cả →
        </Link>
      </div>
      {orders.docs.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-soft">
          Không có đơn hàng chờ duyệt
        </p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {orders.docs.map((order: any) => (
            <li key={order.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-ink">{order.orderId}</p>
                <p className="text-xs text-ink-soft">{order.client}</p>
              </div>
              <span className="rounded bg-background-soft px-2 py-1 text-xs font-medium text-ink-soft">
                {order.quantity} {order.uom || 'Bao'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
