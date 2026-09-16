import { logger } from "@/lib/logger";

export const inventoryService = {
  async recalculate(tenantId: string) {
    logger.info({ tenantId }, "Inventory recalculated");
  },
};
