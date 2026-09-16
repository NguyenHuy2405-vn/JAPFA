import { logger } from "@/lib/logger";

export const importService = {
  async process(fileUrl: string, collection: string) {
    logger.info({ fileUrl, collection }, "Import processed");
    return 0;
  },
};
