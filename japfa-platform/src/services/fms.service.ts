import { logger } from "@/lib/logger";

export const fmsService = {
  async aggregate(date: string) {
    logger.info({ date }, "FMS aggregated");
  },
};
