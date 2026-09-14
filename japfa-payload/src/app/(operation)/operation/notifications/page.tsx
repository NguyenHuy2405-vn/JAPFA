import { getPayload } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import { NotificationList } from "@/components/shared/NotificationList";

export default async function OperationNotificationsPage() {
  const user = await getAppUser();
  if (!user) return null;

  const payload = await getPayload({ config });
  const notifications = await payload.find({
    collection: "notifications",
    limit: 100,
    sort: "-createdAt",
    depth: 0,
    where: {
      recipient: {
        equals: user.id,
      },
    },
    overrideAccess: false,
    user,
  });

  return (
    <NotificationList
      initialNotifications={notifications.docs as never[]}
      roleBasePath="/operation"
      title="Thông báo vận hành"
    />
  );
}
