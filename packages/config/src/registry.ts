import type { TenantConfig } from "./types";
import pmsConfig from "../../../tenants/pms/config";
import veriPropertiesConfig from "../../../tenants/veri-properties/config";

export const tenantRegistry = {
  pms: pmsConfig,
  "veri-properties": veriPropertiesConfig,
} as const satisfies Record<string, TenantConfig>;

export type TenantId = keyof typeof tenantRegistry;

export function getTenantId(): TenantId {
  const id = process.env.TENANT_ID ?? "pms";
  if (!(id in tenantRegistry)) {
    throw new Error(
      `Unknown TENANT_ID "${id}". Valid values: ${Object.keys(tenantRegistry).join(", ")}`
    );
  }
  return id as TenantId;
}

export function getTenant(): TenantConfig {
  return tenantRegistry[getTenantId()];
}
