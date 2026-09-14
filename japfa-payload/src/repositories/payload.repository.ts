import type { getPayload } from "payload";
import type { AuthUser } from "@/server/http/api-error";
import { normalizeTenantId } from "@/utils/tenant";

export type PayloadClient = Awaited<ReturnType<typeof getPayload>>;

/**
 * Repository layer: the ONLY place allowed to call `payload.find/create/update`
 * directly for generic (collection-agnostic) lookups. Services depend on this
 * module instead of importing `getPayload` themselves, so a future swap of the
 * data layer only touches this file.
 */
export async function findOneByField(
  payload: PayloadClient,
  collection: any,
  field: string,
  value: unknown,
  user: AuthUser,
) {
  const result = await payload.find({
    collection,
    where: { [field]: { equals: value } },
    limit: 1,
    depth: 0,
    user: user as never,
    overrideAccess: false,
  });
  return result.docs[0] as any;
}

/** Resolves a Tenant by its display name / managedBy label / tenantId (with or without normalization). */
export async function resolveTenantByDisplay(
  payload: PayloadClient,
  value: unknown,
  user: AuthUser,
) {
  const label = String(value ?? "").trim();
  if (!label) return undefined;
  return (
    (await findOneByField(payload, "tenants", "name", label, user)) ||
    (await findOneByField(payload, "tenants", "managedBy", label, user)) ||
    (await findOneByField(
      payload,
      "tenants",
      "tenantId",
      normalizeTenantId(label),
      user,
    )) ||
    (await findOneByField(payload, "tenants", "tenantId", label, user))
  );
}

/** Create-or-update by unique field; requires explicit confirmation before overwriting an existing record. */
export async function upsertCollection(
  payload: PayloadClient,
  collection: any,
  field: string,
  key: unknown,
  data: Record<string, unknown>,
  confirmUpdate: boolean,
  user: AuthUser,
) {
  const existing = await findOneByField(payload, collection, field, key, user);
  if (existing && !confirmUpdate)
    throw new Error(
      "DUPLICATE_KEY: Bản ghi đã tồn tại, cần xác nhận cập nhật.",
    );
  return existing
    ? payload.update({
        collection,
        id: existing.id,
        data,
        user: user as never,
        overrideAccess: false,
      })
    : payload.create({
        collection,
        data: { ...data, [field]: key },
        user: user as never,
        overrideAccess: false,
      });
}
