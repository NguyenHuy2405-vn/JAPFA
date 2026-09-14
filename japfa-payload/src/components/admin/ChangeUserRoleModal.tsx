"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { changeUserRoleAction } from "@/app/actions/admin/user";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type Role = "ADMIN" | "OPERATION" | "FARM";

type User = {
  id: string | number;
  email: string;
  role: string;
};

const isRole = (value: string): value is Role =>
  value === "ADMIN" || value === "OPERATION" || value === "FARM";

export function ChangeUserRoleModal({
  user,
  open,
  onClose,
}: {
  user: User | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [newRole, setNewRole] = useState<Role>("FARM");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && isRole(user.role)) setNewRole(user.role);
    else setNewRole("FARM");
    setError("");
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    const response = await changeUserRoleAction(user.id, newRole);
    setLoading(false);

    if (response.success) {
      router.refresh();
      onClose();
      return;
    }

    setError(response.message || "Có lỗi xảy ra.");
  };

  return (
    <Modal open={open} onClose={onClose} title="Đổi role user" size="sm">
      {user ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            Đổi role cho <strong className="text-ink">{user.email}</strong>.
          </p>
          <label
            className="block text-sm font-medium text-ink"
            htmlFor="new-role"
          >
            Role mới
          </label>
          <select
            id="new-role"
            value={newRole}
            onChange={(event) => setNewRole(event.target.value as Role)}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ADMIN">ADMIN</option>
            <option value="OPERATION">OPERATION</option>
            <option value="FARM">FARM</option>
          </select>
          <p className="rounded-md border border-line bg-background-soft p-3 text-xs text-ink-soft">
            Session cũ của user sẽ bị vô hiệu sau khi đổi role.
          </p>
          {error ? (
            <p className="text-sm font-medium text-ink">{error}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} loading={loading}>
              Xác nhận
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
