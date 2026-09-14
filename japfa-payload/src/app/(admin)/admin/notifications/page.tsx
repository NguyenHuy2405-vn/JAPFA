import { getPayload } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import { NotificationList } from "@/components/shared/NotificationList";

export default async function AdminNotificationsPage() {
  const user = await getAppUser();
  if (!user) return null;

  const payload = await getPayload({ config });
  const notifications = await payload.find({
    collection: "notifications",
    where: { recipient: { equals: user.id } },
    limit: 100,
    sort: "-createdAt",
    depth: 0,
    overrideAccess: false,
    user,
  });

  return (
    <NotificationList
      initialNotifications={notifications.docs as never[]}
      roleBasePath="/admin"
      title="Thông báo quản trị"
    />
  );
}
