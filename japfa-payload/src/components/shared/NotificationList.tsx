"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/formatters";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notification";

type NotificationItem = {
  id: string | number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  relatedOrder?: string | number;
  relatedTransfer?: string | number;
};

const TYPE_ICONS: Record<string, string> = {
  ORDER_APPROVED: "OK",
  ORDER_REJECTED: "X",
  ORDER_INCOMING: "IN",
  ORDER_RECEIVED: "RCV",
  ORDER_COMPLETED: "DONE",
  ORDER_ISSUE: "WARN",
  TRANSFER_APPROVED: "OK",
  TRANSFER_REJECTED: "X",
  TRANSFER_INCOMING: "IN",
  TRANSFER_RECEIVED: "RCV",
  TRANSFER_COMPLETED: "DONE",
  TRANSFER_ISSUE: "WARN",
};

type Tab = "ALL" | "UNREAD";

const toId = (value: unknown): string | number | undefined => {
  if (typeof value === "object" && value !== null) {
    return (value as { id?: string | number }).id;
  }
  if (typeof value === "string" || typeof value === "number") return value;
  return undefined;
};

export function NotificationList({
  initialNotifications,
  roleBasePath,
  title = "Thông báo",
  showMarkAllButton = true,
}: {
  initialNotifications: NotificationItem[];
  roleBasePath: "/admin" | "/operation" | "/farm";
  title?: string;
  showMarkAllButton?: boolean;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeTab, setActiveTab] = useState<Tab>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  const filtered = useMemo(
    () =>
      activeTab === "UNREAD"
        ? notifications.filter((item) => !item.isRead)
        : notifications,
    [activeTab, notifications],
  );

  const navigateRelated = (item: NotificationItem) => {
    const orderId = toId(item.relatedOrder);
    const transferId = toId(item.relatedTransfer);
    if (orderId) {
      router.push(`${roleBasePath}/orders/${orderId}`);
      return;
    }
    if (transferId) {
      router.push(`${roleBasePath}/transfers/${transferId}`);
    }
  };

  const handleMarkRead = async (item: NotificationItem) => {
    setError("");

    if (item.isRead) {
      navigateRelated(item);
      return;
    }

    const optimisticAt = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((current) =>
        current.id === item.id
          ? { ...current, isRead: true, readAt: optimisticAt }
          : current,
      ),
    );

    const result = await markNotificationReadAction(item.id);
    if (!result.success) {
      setNotifications((prev) =>
        prev.map((current) =>
          current.id === item.id
            ? { ...current, isRead: false, readAt: undefined }
            : current,
        ),
      );
      setError(result.message || "Không thể cập nhật thông báo.");
      return;
    }

    navigateRelated(item);
    router.refresh();
  };

  const handleMarkAllRead = async () => {
    setError("");
    if (unreadCount === 0) return;

    if (!window.confirm(`Đánh dấu ${unreadCount} thông báo là đã đọc?`)) return;

    setLoading(true);
    const prev = notifications;
    const optimisticAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => ({ ...item, isRead: true, readAt: optimisticAt })),
    );

    const result = await markAllNotificationsReadAction();
    setLoading(false);

    if (!result.success) {
      setNotifications(prev);
      setError(result.message || "Không thể cập nhật thông báo.");
      return;
    }

    router.refresh();
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink">
            {title}
          </h1>
          <p className="text-sm text-ink-soft">
            {unreadCount > 0
              ? `${unreadCount} thông báo chưa đọc`
              : "Không có thông báo chưa đọc"}
          </p>
        </div>

        {showMarkAllButton && unreadCount > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllRead}
            loading={loading}
          >
            Danh dau tat ca da doc
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["ALL", "UNREAD"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-label={tab === "ALL" ? "Hiển thị tất cả" : "Hiển thị chưa đọc"}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              activeTab === tab
                ? "bg-primary text-white"
                : "bg-background-soft text-ink-soft hover:bg-background"
            }`}
          >
            {tab === "ALL" ? "Tất cả" : `Chưa đọc (${unreadCount})`}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon="🔔"
          title={
            activeTab === "UNREAD"
              ? "Không có thông báo chưa đọc"
              : "Chưa có thông báo"
          }
          message="Các thông báo đơn hàng và điều chuyển sẽ hiển thị ở đây."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <button
              key={String(item.id)}
              type="button"
              onClick={() => handleMarkRead(item)}
              className={`w-full rounded-md border p-4 text-left transition hover:bg-background-soft ${
                item.isRead
                  ? "border-line bg-surface"
                  : "border-primary bg-primary-light"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="rounded bg-background px-2 py-1 text-xs font-semibold text-ink">
                  {TYPE_ICONS[item.type] || "N"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-ink">{item.title}</p>
                    {!item.isRead ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{item.message}</p>
                  <p className="mt-2 text-xs text-ink-muted">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
