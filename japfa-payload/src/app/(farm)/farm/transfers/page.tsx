import { getPayload } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import { userTenantIds } from "@/access/roles";
import { FarmTransfersClient } from "@/components/farm/FarmTransfersClient";

export default async function FarmTransfersPage() {
  const user = await getAppUser();
  if (!user) return null;

  const payload = await getPayload({ config });
  const tenantIds = userTenantIds(user);

  const [transfers, tenants, products, flocks] = await Promise.all([
    payload.find({
      collection: "transfer-requests",
      where: {
        or: [
          { fromTenant: { in: tenantIds } },
          { toTenant: { in: tenantIds } },
        ],
      },
      limit: 100,
      sort: "-createdAt",
      depth: 1,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: "tenants",
      limit: 200,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: "products",
      limit: 200,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: "flocks",
      limit: 200,
      depth: 0,
      overrideAccess: false,
      user,
    }),
  ]);

  const tenantOptions = tenants.docs
    .filter((item) => !tenantIds.map(String).includes(String(item.id)))
    .map((item) => ({
      id: item.id,
      label: item.name || item.tenantId || String(item.id),
    }));

  const productOptions = products.docs.map((item) => ({
    id: item.id,
    label: item.name || item.sku || String(item.id),
  }));

  const flockOptions = flocks.docs.map((item) => ({
    id: item.id,
    label: item.flockId || item.flockName || String(item.id),
  }));

  return (
    <FarmTransfersClient
      initialTransfers={transfers.docs as never[]}
      destinations={tenantOptions}
      products={productOptions}
      flocks={flockOptions}
    />
  );
}
