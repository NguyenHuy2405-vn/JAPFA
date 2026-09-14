"use client";
import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: ModalProps) {
  if (!open) return null;

  const sizeClass = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
  }[size];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${sizeClass} rounded-md bg-surface shadow-modal`}
        onClick={(event) => event.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-line p-4">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            <button
              onClick={onClose}
              className="text-ink-soft hover:text-ink"
              aria-label="Đóng modal"
              type="button"
            >
              ✕
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
        {footer && (
          <div className="border-t border-line p-4 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
