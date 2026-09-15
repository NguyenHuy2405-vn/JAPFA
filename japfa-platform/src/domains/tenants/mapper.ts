import type { Tenant } from "@/../payload-types";

export type TenantCanonical = {
  tenantId: string;
  name: string;
  tenantType: Tenant["type"];
  status: Tenant["status"];
  metadata?: Record<string, unknown>;
};

export function toTenantCanonical(doc: Tenant): TenantCanonical {
  return {
    tenantId: doc.tenantId,
    name: doc.name,
    tenantType: doc.type,
    status: doc.status,
  };
}

export function fromTenantCanonical(input: {
  tenantId?: string;
  name?: string;
  tenantType?: Tenant["type"];
  status?: Tenant["status"];
}): Partial<Pick<Tenant, "tenantId" | "name" | "type" | "status">> {
  return {
    ...(input.tenantId === undefined ? {} : { tenantId: input.tenantId }),
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.tenantType === undefined ? {} : { type: input.tenantType }),
    ...(input.status === undefined ? {} : { status: input.status }),
  };
}
