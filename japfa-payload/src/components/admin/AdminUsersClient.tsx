"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  lockUserAction,
  regenerateTempPasswordAction,
  unlockUserAction,
} from "@/app/actions/admin/user";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table } from "@/components/ui/Table";
import { ChangeUserRoleModal } from "./ChangeUserRoleModal";
import { CreateOperationUserModal } from "./CreateOperationUserModal";

export type AdminUserRow = {
  id: string | number;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  accountStatus: string;
};

type UserFilter = {
  search: string;
  role: string;
  status: string;
};

export function AdminUsersClient({
  initialUsers,
}: {
  initialUsers: AdminUserRow[];
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [roleUser, setRoleUser] = useState<AdminUserRow | null>(null);
  const [pendingUser, setPendingUser] = useState<AdminUserRow | null>(null);
  const [resetUser, setResetUser] = useState<AdminUserRow | null>(null);
  const [regeneratedPassword, setRegeneratedPassword] = useState<string | null>(
    null,
  );
  const [loadingId, setLoadingId] = useState<string | number | null>(null);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<UserFilter>({
    search: "",
    role: "ALL",
    status: "ALL",
  });

  const filteredUsers = useMemo(() => {
    return initialUsers.filter((user) => {
      const search = filter.search.trim().toLowerCase();
      if (search) {
        const haystack =
          `${user.email} ${user.fullName} ${user.phone}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (filter.role !== "ALL" && user.role !== filter.role) return false;
      if (filter.status !== "ALL" && user.accountStatus !== filter.status)
        return false;
      return true;
    });
  }, [filter, initialUsers]);

  const handleToggleLock = async () => {
    if (!pendingUser) return;
    setLoadingId(pendingUser.id);
    setMessage("");
    const action =
      pendingUser.accountStatus === "LOCKED"
        ? unlockUserAction
        : lockUserAction;
    const response = await action(pendingUser.id);
    setLoadingId(null);
    setPendingUser(null);

    if (response.success) {
      setMessage(
        pendingUser.accountStatus === "LOCKED"
          ? "User đã được mở khóa."
          : "User đã được khóa.",
      );
      router.refresh();
      return;
    }

    setMessage(response.message || "Có lỗi xảy ra.");
  };

  const handleRegenerateTempPassword = async () => {
    if (!resetUser) return;
    setLoadingId(resetUser.id);
    setMessage("");

    const response = await regenerateTempPasswordAction(resetUser.id);
    setLoadingId(null);

    if (response.success) {
      setRegeneratedPassword(response.data.tempPassword);
      router.refresh();
      return;
    }

    setResetUser(null);
    setRegeneratedPassword(null);
    setMessage(response.message || "Có lỗi xảy ra.");
  };

  const closeResetModal = () => {
    setResetUser(null);
    setRegeneratedPassword(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink">
            Quản lý User
          </h1>
          <p className="text-sm text-ink-soft">
            Quản lý tài khoản và phân quyền ADMIN.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Tạo OPERATION user</Button>
      </div>

      {message ? (
        <p className="rounded-md border border-line bg-background-soft px-3 py-2 text-sm text-ink">
          {message}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          aria-label="Tìm user"
          type="search"
          placeholder="Tìm email, tên hoặc số điện thoại..."
          value={filter.search}
          onChange={(event) =>
            setFilter({ ...filter, search: event.target.value })
          }
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <select
          aria-label="Lọc role"
          value={filter.role}
          onChange={(event) =>
            setFilter({ ...filter, role: event.target.value })
          }
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="ALL">Tất cả role</option>
          <option value="ADMIN">ADMIN</option>
          <option value="OPERATION">OPERATION</option>
          <option value="FARM">FARM</option>
        </select>
        <select
          aria-label="Lọc trạng thái user"
          value={filter.status}
          onChange={(event) =>
            setFilter({ ...filter, status: event.target.value })
          }
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="LOCKED">Khóa</option>
        </select>
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState
          title="Chưa có user phù hợp"
          message="Thử đổi bộ lọc hoặc tạo OPERATION user mới."
          action={
            <Button onClick={() => setShowCreate(true)}>
              Tạo OPERATION user
            </Button>
          }
        />
      ) : (
        <Table headers={["Email", "Họ tên", "Role", "Trạng thái", "Thao tác"]}>
          {filteredUsers.map((user) => (
            <tr
              key={user.id}
              className="border-b border-line-soft last:border-0 hover:bg-background-soft"
            >
              <td className="px-4 py-3 font-medium text-ink">{user.email}</td>
              <td className="px-4 py-3 text-ink">{user.fullName || "-"}</td>
              <td className="px-4 py-3 text-ink-soft">{user.role}</td>
              <td className="px-4 py-3">
                <StatusBadge status={user.accountStatus} />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Cấp lại mật khẩu tạm cho ${user.email}`}
                    onClick={() => {
                      setRegeneratedPassword(null);
                      setResetUser(user);
                    }}
                  >
                    Cấp lại mật khẩu tạm
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Đổi role ${user.email}`}
                    onClick={() => setRoleUser(user)}
                  >
                    Đổi role
                  </Button>
                  <Button
                    variant={
                      user.accountStatus === "LOCKED" ? "secondary" : "danger"
                    }
                    size="sm"
                    loading={loadingId === user.id}
                    aria-label={`${user.accountStatus === "LOCKED" ? "Unlock" : "Lock"} ${user.email}`}
                    onClick={() => setPendingUser(user)}
                  >
                    {user.accountStatus === "LOCKED" ? "Unlock" : "Lock"}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <CreateOperationUserModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
      <ChangeUserRoleModal
        user={roleUser}
        open={Boolean(roleUser)}
        onClose={() => setRoleUser(null)}
      />
      <Modal
        open={Boolean(resetUser)}
        onClose={closeResetModal}
        title="Cấp lại mật khẩu tạm"
        size="sm"
      >
        {regeneratedPassword ? (
          <div className="space-y-4">
            <div className="rounded-md border border-line bg-background-soft p-4">
              <p className="text-sm font-semibold text-ink">
                Cấp lại thành công
              </p>
              <p className="mt-2 text-sm text-ink-soft">Mật khẩu tạm mới</p>
              <code className="mt-1 block rounded-md border border-line bg-surface px-3 py-2 font-mono text-sm text-ink">
                {regeneratedPassword}
              </code>
              <p className="mt-2 text-xs text-ink-muted">
                Người dùng sẽ bị yêu cầu đổi mật khẩu khi đăng nhập lần tới.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={closeResetModal}>Đóng</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">
              Cấp lại mật khẩu tạm cho {resetUser?.email}? Mật khẩu hiện tại của
              user sẽ bị thay thế.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeResetModal}>
                Hủy
              </Button>
              <Button
                onClick={handleRegenerateTempPassword}
                loading={resetUser ? loadingId === resetUser.id : false}
              >
                Xác nhận
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(pendingUser)}
        onClose={() => setPendingUser(null)}
        title={
          pendingUser?.accountStatus === "LOCKED" ? "Unlock user" : "Lock user"
        }
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            {pendingUser?.accountStatus === "LOCKED"
              ? `Mở khóa user ${pendingUser.email}?`
              : `Khóa user ${pendingUser?.email}? Session cũ sẽ bị vô hiệu.`}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingUser(null)}>
              Hủy
            </Button>
            <Button
              variant={
                pendingUser?.accountStatus === "LOCKED" ? "primary" : "danger"
              }
              onClick={handleToggleLock}
              loading={pendingUser ? loadingId === pendingUser.id : false}
            >
              Xác nhận
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
