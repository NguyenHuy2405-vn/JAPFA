import { logger } from "@/lib/logger";

export const auditService = {
  async archive(beforeDate: string) {
    logger.info({ beforeDate }, "Audit archived");
  },
};
