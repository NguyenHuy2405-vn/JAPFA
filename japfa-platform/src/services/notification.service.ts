import { getPayload } from "payload";
import config from "@payload-config";
import { logger } from "@/lib/logger";

export const notificationService = {
  async send(input: {
    title: string;
    targetCollection?: string;
    targetId?: string;
  }) {
    const payload = await getPayload({ config });

    await payload.create({
      collection: "notifications",
      data: {
        title: input.title,
        message: input.title,
        type: "ORDER_APPROVED",
        recipient: 1,
      } as never,
      overrideAccess: true,
    });

    logger.info(
      { targetCollection: input.targetCollection, targetId: input.targetId },
      "Notification sent",
    );
  },
};
