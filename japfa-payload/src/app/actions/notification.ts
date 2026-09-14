"use server";

import { getPayload } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; message: string };

const normalizeRecipientId = (recipient: unknown): string => {
  if (typeof recipient === "object" && recipient !== null) {
    return String((recipient as { id?: string | number }).id || "");
  }
  return String(recipient || "");
};

export async function markNotificationReadAction(
  notificationId: string | number,
): Promise<ActionResult<{ notificationId: string | number }>> {
  const actor = await getAppUser();
  if (!actor) {
    return {
      success: false,
      error: "UNAUTHORIZED",
      message: "Vui lòng đăng nhập.",
    };
  }

  try {
    const payload = await getPayload({ config });
    const notification = await payload.findByID({
      collection: "notifications",
      id: notificationId,
      depth: 0,
      overrideAccess: true,
      user: actor,
    });

    const recipientId = normalizeRecipientId(notification.recipient);
    if (recipientId !== String(actor.id)) {
      return {
        success: false,
        error: "FORBIDDEN",
        message: "Bạn không có quyền đọc thông báo này.",
      };
    }

    if (notification.isRead) {
      return { success: true, data: { notificationId } };
    }

    await payload.update({
      collection: "notifications",
      id: notificationId,
      data: {
        isRead: true,
        readAt: new Date().toISOString(),
      } as never,
      overrideAccess: true,
      user: actor,
    });

    return { success: true, data: { notificationId } };
  } catch (err) {
    console.error("[ACTION] markNotificationReadAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}

export async function markAllNotificationsReadAction(): Promise<
  ActionResult<{ count: number }>
> {
  const actor = await getAppUser();
  if (!actor) {
    return {
      success: false,
      error: "UNAUTHORIZED",
      message: "Vui lòng đăng nhập.",
    };
  }

  try {
    const payload = await getPayload({ config });
    const unread = await payload.find({
      collection: "notifications",
      where: {
        and: [
          { recipient: { equals: actor.id } },
          { isRead: { equals: false } },
        ],
      },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
      user: actor,
    });

    if (unread.docs.length === 0) {
      return { success: true, data: { count: 0 } };
    }

    const now = new Date().toISOString();
    await Promise.all(
      unread.docs.map(async (item) => {
        const recipientId = normalizeRecipientId(item.recipient);
        if (recipientId !== String(actor.id)) return;

        await payload.update({
          collection: "notifications",
          id: item.id,
          data: {
            isRead: true,
            readAt: now,
          } as never,
          overrideAccess: true,
          user: actor,
        });
      }),
    );

    return { success: true, data: { count: unread.docs.length } };
  } catch (err) {
    console.error("[ACTION] markAllNotificationsReadAction", err);
    return {
      success: false,
      error: "INTERNAL_ERROR",
      message: "Đã xảy ra lỗi.",
    };
  }
}
