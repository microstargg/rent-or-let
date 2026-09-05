export type { SiteContent, TenantConfig, TenantLogoText } from "./types";
export { tenantRegistry, getTenantConfig } from "./registry";
export type { TenantId } from "./registry";
export { TenantProvider, useTenant } from "./tenant-context";
export {
  AGENCY_SLUG_HEADER,
  AGENCY_SLUG_ALIASES,
  LETFLOW_ROOT_DOMAIN,
  canonicalizeAgencySlug,
  defaultPlatformHost,
  fallbackAgencySlug,
  hostnameOf,
  slugFromLetflowHost,
} from "./host";
