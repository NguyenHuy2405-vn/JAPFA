import { getPayload } from "payload";
import config from "@payload-config";
import { getAppUser } from "@/server/auth";
import { userTenantIds } from "@/access/roles";
import { FarmOrdersClient } from "@/components/farm/FarmOrdersClient";

export default async function FarmOrdersPage() {
  const user = await getAppUser();
  if (!user) return null;

  const payload = await getPayload({ config });
  const tenantIds = userTenantIds(user);

  const [orders, tenants, products, flocks] = await Promise.all([
    payload.find({
      collection: "orders",
      where: {
        or: [
          { tenant: { in: tenantIds } },
          { origin: { in: tenantIds } },
          { destination: { in: tenantIds } },
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

  const tenantOptions = tenants.docs.map((item) => ({
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

  const origins = tenantOptions.filter((item) =>
    tenantIds.map(String).includes(String(item.id)),
  );

  return (
    <FarmOrdersClient
      initialOrders={orders.docs as never[]}
      origins={origins}
      destinations={tenantOptions}
      products={productOptions}
      flocks={flockOptions}
    />
  );
}
