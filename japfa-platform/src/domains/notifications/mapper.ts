import type { Notification } from "@/../payload-types";

export type NotificationCanonical = {
  content: string;
  targetUser: Notification["recipient"];
};

export function toNotificationCanonical(
  doc: Notification,
): NotificationCanonical {
  return {
    content: doc.message,
    targetUser: doc.recipient,
  };
}

export function fromNotificationCanonical(input: {
  content?: string;
  targetUser?: Notification["recipient"];
}): Partial<Pick<Notification, "message" | "recipient">> {
  return {
    ...(input.content === undefined ? {} : { message: input.content }),
    ...(input.targetUser === undefined
      ? {}
      : { recipient: input.targetUser }),
  };
}
