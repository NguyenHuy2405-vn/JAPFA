"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { lockFarmAction, unlockFarmAction } from "@/app/actions/admin/farm";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table } from "@/components/ui/Table";
import { formatDate } from "@/lib/formatters";
import { CreateFarmWizardModal } from "./CreateFarmWizardModal";

export type AdminFarmRow = {
  id: string | number;
  farmCode: string;
  tenantId: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
};

type FarmFilter = {
  search: string;
  type: string;
  status: string;
};

export function AdminFarmsClient({
  initialFarms,
}: {
  initialFarms: AdminFarmRow[];
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<FarmFilter>({
    search: "",
    type: "ALL",
    status: "ALL",
  });
  const [pendingFarm, setPendingFarm] = useState<AdminFarmRow | null>(null);
  const [loadingId, setLoadingId] = useState<string | number | null>(null);
  const [message, setMessage] = useState("");

  const filteredFarms = useMemo(() => {
    return initialFarms.filter((farm) => {
      const search = filter.search.trim().toLowerCase();
      if (search) {
        const haystack =
          `${farm.farmCode} ${farm.tenantId} ${farm.name}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (filter.type !== "ALL" && farm.type !== filter.type) return false;
      if (filter.status !== "ALL" && farm.status !== filter.status)
        return false;
      return true;
    });
  }, [filter, initialFarms]);

  const handleToggleLock = async () => {
    if (!pendingFarm) return;
    setLoadingId(pendingFarm.id);
    setMessage("");
    const action =
      pendingFarm.status === "LOCKED" ? unlockFarmAction : lockFarmAction;
    const response = await action(pendingFarm.id);
    setLoadingId(null);
    setPendingFarm(null);

    if (response.success) {
      setMessage(
        pendingFarm.status === "LOCKED"
          ? "Farm đã được mở khóa."
          : "Farm đã được khóa.",
      );
      router.refresh();
      return;
    }

    setMessage(response.message || "Có lỗi xảy ra.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink">
            Quản lý Farm
          </h1>
          <p className="text-sm text-ink-soft">
            Tạo và quản lý trang trại, nhà máy trong hệ thống.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Tạo Farm mới</Button>
      </div>

      {message ? (
        <p className="rounded-md border border-line bg-background-soft px-3 py-2 text-sm text-ink">
          {message}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          aria-label="Tìm Farm"
          type="search"
          placeholder="Tìm mã hoặc tên Farm..."
          value={filter.search}
          onChange={(event) =>
            setFilter({ ...filter, search: event.target.value })
          }
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <select
          aria-label="Lọc loại Farm"
          value={filter.type}
          onChange={(event) =>
            setFilter({ ...filter, type: event.target.value })
          }
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="ALL">Tất cả loại</option>
          <option value="FARM">Trang trại</option>
          <option value="FACTORY">Nhà máy</option>
        </select>
        <select
          aria-label="Lọc trạng thái Farm"
          value={filter.status}
          onChange={(event) =>
            setFilter({ ...filter, status: event.target.value })
          }
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="INACTIVE">Ngừng</option>
          <option value="LOCKED">Khóa</option>
        </select>
      </div>

      {filteredFarms.length === 0 ? (
        <EmptyState
          title="Chưa có Farm phù hợp"
          message="Thử đổi bộ lọc hoặc tạo Farm mới."
          action={
            <Button onClick={() => setShowCreate(true)}>Tạo Farm mới</Button>
          }
        />
      ) : (
        <Table
          headers={[
            "Mã Farm",
            "Tên Farm",
            "Loại",
            "Trạng thái",
            "Ngày tạo",
            "Thao tác",
          ]}
        >
          {filteredFarms.map((farm) => (
            <tr
              key={farm.id}
              className="border-b border-line-soft last:border-0 hover:bg-background-soft"
            >
              <td className="px-4 py-3 font-medium text-ink">
                {farm.farmCode || farm.tenantId}
              </td>
              <td className="px-4 py-3 text-ink">{farm.name}</td>
              <td className="px-4 py-3 text-ink-soft">{farm.type}</td>
              <td className="px-4 py-3">
                <StatusBadge status={farm.status} />
              </td>
              <td className="px-4 py-3 text-xs text-ink-soft">
                {formatDate(farm.createdAt)}
              </td>
              <td className="px-4 py-3">
                <Button
                  variant={farm.status === "LOCKED" ? "secondary" : "danger"}
                  size="sm"
                  loading={loadingId === farm.id}
                  aria-label={`${farm.status === "LOCKED" ? "Unlock" : "Lock"} ${farm.name}`}
                  onClick={() => setPendingFarm(farm)}
                >
                  {farm.status === "LOCKED" ? "Unlock" : "Lock"}
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <CreateFarmWizardModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
      <Modal
        open={Boolean(pendingFarm)}
        onClose={() => setPendingFarm(null)}
        title={pendingFarm?.status === "LOCKED" ? "Unlock Farm" : "Lock Farm"}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            {pendingFarm?.status === "LOCKED"
              ? `Mở khóa Farm ${pendingFarm.name}?`
              : `Khóa Farm ${pendingFarm?.name}? User thuộc Farm bị khóa sẽ không qua được session check.`}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingFarm(null)}>
              Hủy
            </Button>
            <Button
              variant={pendingFarm?.status === "LOCKED" ? "primary" : "danger"}
              onClick={handleToggleLock}
              loading={pendingFarm ? loadingId === pendingFarm.id : false}
            >
              Xác nhận
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
