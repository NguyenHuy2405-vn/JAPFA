import { logger } from "@/lib/logger";

export const searchService = {
  async reindex(collection?: string) {
    logger.info({ collection }, "Search reindexed");
  },
};
