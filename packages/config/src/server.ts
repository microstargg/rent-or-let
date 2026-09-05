import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { TenantConfig } from "./types";
import type { Agency } from "./runtime";
import { getAgencyBySlug } from "./runtime";
import { fallbackAgencySlug } from "./host";

const agencyAls = new AsyncLocalStorage<Agency>();

export function runWithAgency<T>(agency: Agency, fn: () => T): T {
  return agencyAls.run(agency, fn);
}

export async function runWithAgencyAsync<T>(
  agency: Agency,
  fn: () => Promise<T>
): Promise<T> {
  return agencyAls.run(agency, fn);
}

export function getAgencyOrNull(): Agency | null {
  return agencyAls.getStore() ?? null;
}

export function getAgency(): Agency {
  const current = agencyAls.getStore();
  if (current) return current;
  return getAgencyBySlug(fallbackAgencySlug());
}

/** Branding for the current request (ALS) or env fallback. */
export function getTenant(): TenantConfig {
  return getAgency().config;
}

export function getTenantId(): string {
  return getAgency().slug;
}

export function bindAgency(agency: Agency): void {
  agencyAls.enterWith(agency);
}

export {
  getAgencyBySlug,
  listAgencySlugs,
  resolveAgencySlug,
  matchAgencySlug,
  agencySlugFromHostname,
  platformUrlFor,
  siteUrlFor,
  publicBranding,
} from "./runtime";
export type { Agency, AgencyRuntime, AgencyFeatures } from "./runtime";
