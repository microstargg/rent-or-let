import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { TenantConfig } from "./types";
import type { Agency } from "./runtime";
import { getAgencyBySlug } from "./runtime";
import { fallbackAgencySlug } from "./host";

type AgencyStore = {
  /** Null while an async request lookup is still resolving (see openAgencySlot). */
  agency: Agency | null;
  /** Cron/scripts set this so request-header rebinding cannot override the chosen agency. */
  locked: boolean;
};

const agencyAls = new AsyncLocalStorage<AgencyStore>();

export function runWithAgency<T>(agency: Agency, fn: () => T): T {
  return agencyAls.run({ agency, locked: true }, fn);
}

export async function runWithAgencyAsync<T>(
  agency: Agency,
  fn: () => Promise<T>
): Promise<T> {
  return agencyAls.run({ agency, locked: true }, fn);
}

export function getAgencyOrNull(): Agency | null {
  return agencyAls.getStore()?.agency ?? null;
}

export function isAgencyContextLocked(): boolean {
  return agencyAls.getStore()?.locked === true;
}

export function getAgency(): Agency {
  const current = agencyAls.getStore()?.agency;
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
  if (isAgencyContextLocked()) return;
  agencyAls.enterWith({ agency, locked: false });
}

/**
 * Enter (or reuse) an unlocked store in the caller's async context, to be filled in
 * once the agency resolves. Call it before the first `await`: with AsyncContextFrame
 * (Node 24), an `enterWith` after an await never reaches the caller, so route handlers
 * that bind through an async helper would otherwise see no agency at all.
 */
export function openAgencySlot(): AgencyStore {
  const current = agencyAls.getStore();
  if (current) return current;
  const slot: AgencyStore = { agency: null, locked: false };
  agencyAls.enterWith(slot);
  return slot;
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
