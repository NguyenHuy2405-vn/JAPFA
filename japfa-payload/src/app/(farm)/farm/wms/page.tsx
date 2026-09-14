import { getPayload } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import { userTenantIds } from "@/access/roles";
import { FarmWmsClient } from "@/components/farm/FarmWmsClient";

export default async function FarmWmsPage() {
  const user = await getAppUser();
  if (!user) return null;

  const payload = await getPayload({ config });
  const tenantIds = userTenantIds(user);
  const [rows, products, flocks] = await Promise.all([
    payload.find({
      collection: "wms-transactions",
      where: { tenant: { in: tenantIds } },
      limit: 100,
      sort: "-date",
      depth: 1,
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
      where: { tenant: { in: tenantIds } },
      limit: 200,
      depth: 0,
      overrideAccess: false,
      user,
    }),
  ]);

  const productOptions = products.docs.map((item) => ({
    id: item.id,
    label: item.name || item.sku || String(item.id),
  }));

  const flockOptions = flocks.docs.map((item) => ({
    id: item.id,
    label: item.flockId || item.flockName || String(item.id),
  }));

  return (
    <FarmWmsClient
      initialRows={rows.docs as never[]}
      products={productOptions}
      flocks={flockOptions}
    />
  );
}
