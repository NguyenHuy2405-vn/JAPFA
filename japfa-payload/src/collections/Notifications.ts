import type { CollectionConfig } from "payload";
import { denyAll } from "@/access/permissions";

export const Notifications: CollectionConfig = {
  slug: "notifications",
  access: {
    read: ({ req }) => {
      const user = req.user;
      if (!user) return false;
      return { recipient: { equals: user.id } };
    },
    create: () => true,
    update: ({ req }) => {
      const user = req.user;
      if (!user) return false;
      return { recipient: { equals: user.id } };
    },
    delete: denyAll,
  },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["recipient", "type", "title", "isRead", "createdAt"],
  },
  fields: [
    {
      name: "recipient",
      type: "relationship",
      relationTo: "users",
      required: true,
      label: "Người nhận",
      index: true,
    },
    {
      name: "type",
      type: "select",
      required: true,
      label: "Loại thông báo",
      options: [
        { label: "Đơn đã duyệt", value: "ORDER_APPROVED" },
        { label: "Đơn bị từ chối", value: "ORDER_REJECTED" },
        { label: "Có hàng đến", value: "ORDER_INCOMING" },
        { label: "Hàng đã nhận", value: "ORDER_RECEIVED" },
        { label: "Đơn hoàn tất", value: "ORDER_COMPLETED" },
        { label: "Báo cáo sự cố đơn", value: "ORDER_ISSUE" },
        { label: "Điều chuyển đã duyệt", value: "TRANSFER_APPROVED" },
        { label: "Điều chuyển bị từ chối", value: "TRANSFER_REJECTED" },
        { label: "Hàng điều chuyển đến", value: "TRANSFER_INCOMING" },
        { label: "Đã nhận hàng điều chuyển", value: "TRANSFER_RECEIVED" },
        { label: "Điều chuyển hoàn tất", value: "TRANSFER_COMPLETED" },
        { label: "Báo cáo sự cố điều chuyển", value: "TRANSFER_ISSUE" },
      ],
    },
    { name: "title", type: "text", required: true, label: "Tiêu đề" },
    { name: "message", type: "textarea", required: true, label: "Nội dung" },
    {
      name: "relatedOrder",
      type: "relationship",
      relationTo: "orders",
      label: "Đơn hàng liên quan",
    },
    {
      name: "relatedTransfer",
      type: "relationship",
      relationTo: "transfer-requests",
      label: "Lệnh điều chuyển liên quan",
    },
    {
      name: "isRead",
      type: "checkbox",
      defaultValue: false,
      label: "Đã đọc",
      index: true,
    },
    { name: "readAt", type: "date", label: "Thời gian đọc" },
  ],
};
