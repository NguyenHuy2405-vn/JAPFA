import { getPayload } from "payload";
import config from "@payload-config";
import {
  AdminUsersClient,
  type AdminUserRow,
} from "@/components/admin/AdminUsersClient";
import { getAppUser } from "@/server/auth";

export default async function AdminUsersPage() {
  const user = await getAppUser();
  const payload = await getPayload({ config });
  const users = await payload.find({
    collection: "users",
    limit: 50,
    sort: "-createdAt",
    depth: 0,
    overrideAccess: false,
    user: user!,
  });
  const rows: AdminUserRow[] = users.docs.map((item) => ({
    id: item.id,
    email: String(item.email || ""),
    fullName: String(item.fullName || ""),
    phone: String(item.phone || ""),
    role: String(item.role || ""),
    accountStatus: String(item.accountStatus || ""),
  }));

  return <AdminUsersClient initialUsers={rows} />;
}
