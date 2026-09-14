import { getPayload } from "payload";
import config from "@payload-config";
import {
  AdminFarmsClient,
  type AdminFarmRow,
} from "@/components/admin/AdminFarmsClient";
import { getAppUser } from "@/server/auth";

export default async function AdminFarmsPage() {
  const user = await getAppUser();
  const payload = await getPayload({ config });
  const farms = await payload.find({
    collection: "tenants",
    limit: 50,
    sort: "-createdAt",
    depth: 0,
    overrideAccess: false,
    user: user!,
  });
  const rows: AdminFarmRow[] = farms.docs.map((farm) => ({
    id: farm.id,
    farmCode: String(farm.farmCode || ""),
    tenantId: String(farm.tenantId || ""),
    name: String(farm.name || ""),
    type: String(farm.type || ""),
    status: String(farm.status || ""),
    createdAt: String(farm.createdAt || new Date().toISOString()),
  }));

  return <AdminFarmsClient initialFarms={rows} />;
}
