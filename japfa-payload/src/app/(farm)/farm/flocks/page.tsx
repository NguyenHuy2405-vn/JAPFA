import { getPayload } from "payload";
import config from "@payload-config";
import { userTenantIds } from "@/access/roles";
import { FarmFlocksClient } from "@/components/farm/FarmFlocksClient";
import { getAppUser } from "@/server/auth";

export default async function FarmFlocksPage() {
  const user = await getAppUser();
  if (!user) return null;

  const payload = await getPayload({ config });
  const tenantIds = userTenantIds(user);

  const flocks = await payload.find({
    collection: "flocks",
    where: { tenant: { in: tenantIds } },
    limit: 100,
    sort: "-createdAt",
    depth: 1,
    overrideAccess: false,
    user,
  });

  return <FarmFlocksClient initialFlocks={flocks.docs as never[]} />;
}
