"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/operation/dashboard", title: "Dashboard" },
  { href: "/operation/orders/pending", title: "Orders Pending" },
  { href: "/operation/orders/in-transit", title: "Orders In Transit" },
  { href: "/operation/transfers/pending", title: "Transfers Pending" },
  { href: "/operation/transfers/in-transit", title: "Transfers In Transit" },
  { href: "/operation/notifications", title: "Notifications" },
];

export function OperationSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-line bg-surface p-3 md:w-72 md:border-b-0 md:border-r md:p-4">
      <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-primary text-white"
                  : "text-ink-soft hover:bg-background-soft hover:text-ink"
              }`}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
