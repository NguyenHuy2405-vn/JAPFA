export const FIELD_MAPPING = {
  tenants: {
    tenantType: "type",
  },
  products: {
    category: "productType",
  },
  notifications: {
    content: "message",
    targetUser: "recipient",
  },
  "fms-daily-logs": {
    feedConsumed: "feedQtyAct",
    mortality: "mortAct",
    avgWeight: "endQty",
  },
} as const;
