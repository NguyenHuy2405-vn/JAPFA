export const formatDate = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export const formatStatus = (status: string): string => {
  const map: Record<string, string> = {
    DRAFT: "Bản nháp",
    SUBMITTED: "Đã gửi",
    APPROVED: "Đã duyệt",
    REJECTED: "Từ chối",
    IN_TRANSIT: "Đang vận chuyển",
    RECEIVED: "Đã nhận",
    COMPLETED: "Hoàn tất",
    CANCELLED: "Đã hủy",
    ACTIVE: "Hoạt động",
    INACTIVE: "Ngừng",
    LOCKED: "Khóa",
  };

  return map[status] || status;
};
