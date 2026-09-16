import { logger } from "@/lib/logger";

export const emailService = {
  async sendWelcome(email: string) {
    logger.info({ email }, "Welcome email queued");
  },
};
