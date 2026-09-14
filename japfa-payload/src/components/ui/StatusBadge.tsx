type StatusBadgeProps = {
  status: string;
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  INACTIVE: "bg-slate-100 text-slate-800",
  LOCKED: "bg-red-100 text-red-800",
  DRAFT: "bg-slate-100 text-slate-800",
  SUBMITTED: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  IN_TRANSIT: "bg-blue-100 text-blue-800",
  RECEIVED: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-100 text-slate-800",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] || "bg-slate-100 text-slate-800";
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {status}
    </span>
  );
}
