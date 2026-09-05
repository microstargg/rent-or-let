import { getAgency, platformUrlFor, siteUrlFor } from "@repo/config/server";

/** Canonical LetFlow platform origin (admin, portals, APIs). */
export function getAppUrl(): string {
  return platformUrlFor(getAgency());
}

/** Optional advertising site origin. Null when the agency is backend-only. */
export function getSiteUrl(): string | null {
  return siteUrlFor(getAgency());
}

/** Property page on the public site, or null if they have no website. */
export function getPublicListingUrl(propertySlug: string): string | null {
  const site = getSiteUrl();
  if (!site) return null;
  return `${site}/properties/${propertySlug}`;
}
