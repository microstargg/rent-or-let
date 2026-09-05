import type { TenantConfig } from "./types";
import pmsConfig from "../../../tenants/pms/config";
import veriPropertiesConfig from "../../../tenants/veri-properties/config";

export const tenantRegistry = {
  pms: pmsConfig,
  "veri-properties": veriPropertiesConfig,
} as const satisfies Record<string, TenantConfig>;

export type TenantId = keyof typeof tenantRegistry;

export function getTenantConfig(id: string): TenantConfig {
  if (!(id in tenantRegistry)) {
    throw new Error(
      `Unknown agency "${id}". Valid values: ${Object.keys(tenantRegistry).join(", ")}`
    );
  }
  return tenantRegistry[id as TenantId];
}
