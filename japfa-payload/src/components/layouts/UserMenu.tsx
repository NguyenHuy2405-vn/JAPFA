"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UserMenuProps = {
  role: string;
  userEmail: string;
  userName?: string | null;
};

export function UserMenu({ role, userEmail, userName }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const onLogout = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setSubmitting(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Mở menu người dùng"
        className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-background-soft sm:text-sm"
        onClick={() => setOpen((value) => !value)}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4 text-ink-soft"
        >
          <path
            d="M20 21a8 8 0 10-16 0m12-11a4 4 0 11-8 0 4 4 0 018 0z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="max-w-32 truncate">{userName || userEmail}</span>
        <span className="rounded-full bg-background-soft px-1.5 py-0.5 text-xs font-semibold text-ink-soft">
          {role}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-64 rounded-md border border-line bg-surface p-2 shadow-card">
          <div className="border-b border-line-soft px-2 pb-2">
            <p className="text-sm font-semibold text-ink">{userName || "Người dùng"}</p>
            <p className="text-xs text-ink-soft">{userEmail}</p>
          </div>
          <div className="pt-2">
            <a
              href="/change-password"
              className="block rounded-sm px-2 py-2 text-sm text-ink-soft transition hover:bg-background-soft hover:text-ink"
              onClick={() => setOpen(false)}
            >
              Đổi mật khẩu
            </a>
            <button
              type="button"
              onClick={onLogout}
              disabled={submitting}
              className="mt-1 w-full rounded-sm bg-primary px-3 py-2 text-left text-sm font-medium text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Đang đăng xuất..." : "Đăng xuất"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
