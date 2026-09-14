import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: string;
  title: string;
  message?: string;
  action?: ReactNode;
};

export function EmptyState({
  icon = "📭",
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-line bg-surface p-12 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      {message && <p className="mt-1 text-sm text-ink-soft">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
