import { getPayload } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import { userTenantIds } from "@/access/roles";
import { FarmFmsClient } from "@/components/farm/FarmFmsClient";

export default async function FarmFmsPage() {
  const user = await getAppUser();
  if (!user) return null;

  const payload = await getPayload({ config });
  const tenantIds = userTenantIds(user);
  const [rows, flocks] = await Promise.all([
    payload.find({
      collection: "fms-daily-logs",
      where: { tenant: { in: tenantIds } },
      limit: 100,
      sort: "-date",
      depth: 1,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: "flocks",
      where: { tenant: { in: tenantIds } },
      limit: 200,
      depth: 0,
      overrideAccess: false,
      user,
    }),
  ]);

  const flockOptions = flocks.docs.map((item) => ({
    id: item.id,
    label: item.flockId || item.flockName || String(item.id),
  }));

  return (
    <FarmFmsClient initialRows={rows.docs as never[]} flocks={flockOptions} />
  );
}
