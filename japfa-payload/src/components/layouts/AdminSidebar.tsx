"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BASE_ITEMS = [
  { href: "/admin/dashboard", title: "Dashboard" },
  { href: "/admin/notifications", title: "Notifications" },
  { href: "/admin/farms", title: "Farms" },
  { href: "/admin/users", title: "Users" },
  { href: "/admin/audit-logs", title: "Audit Logs" },
];

const ITEMS = [
  ...BASE_ITEMS,
  ...(process.env.NEXT_PUBLIC_ENABLE_LEGACY_DASHBOARD === "true"
    ? [{ href: "/admin/legacy-dashboard", title: "Legacy Dashboard" }]
    : []),
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-line bg-surface p-3 md:w-64 md:border-b-0 md:border-r md:p-4">
      <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
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
