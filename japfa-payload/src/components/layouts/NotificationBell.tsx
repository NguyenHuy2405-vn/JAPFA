"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getJson } from "@/services/api/http";

type NotificationBellProps = {
  href: string;
};

type NotificationPayload = {
  success: boolean;
  data?: {
    unreadCount?: number;
  };
};

export function NotificationBell({ href }: NotificationBellProps) {
  const [count, setCount] = useState(0);

  const label = useMemo(
    () => (count > 0 ? `${count} thông báo chưa đọc` : "Không có thông báo mới"),
    [count],
  );

  useEffect(() => {
    let mounted = true;

    const fetchUnread = async () => {
      const result = (await getJson(
        "/api/notifications?unread=true&limit=1",
      )) as NotificationPayload;
      if (!mounted || !result?.success) return;
      setCount(Number(result.data?.unreadCount || 0));
    };

    fetchUnread();
    const timer = window.setInterval(fetchUnread, 30_000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <Link
      href={href}
      aria-label={label}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition hover:bg-background-soft"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-4 w-4"
      >
        <path
          d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-xs font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
