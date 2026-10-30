import { AGENCY_SLUG_HEADER } from "@repo/config/host";
import type { Agency } from "@repo/config/runtime";
import { PUBLIC_API, type PublicListing } from "@repo/site-core";
import { getSiteAgency, platformOrigin } from "./agency";

async function platformGet<T>(path: string): Promise<T> {
  const agency = await getSiteAgency();
  const res = await fetch(`${platformOrigin(agency)}${path}`, {
    headers: { [AGENCY_SLUG_HEADER]: agency.slug },
    next: { tags: ["listings", `agency:${agency.slug}`], revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`Platform ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function fetchListings(filters?: {
  minBedrooms?: number;
  maxRent?: number;
  town?: string;
}): Promise<PublicListing[]> {
  const params = new URLSearchParams();
  if (filters?.minBedrooms) params.set("minBedrooms", String(filters.minBedrooms));
  if (filters?.maxRent) params.set("maxRent", String(filters.maxRent));
  if (filters?.town) params.set("town", filters.town);
  const qs = params.toString();
  const data = await platformGet<{ listings: PublicListing[] }>(
    `${PUBLIC_API.listings}${qs ? `?${qs}` : ""}`
  );
  return data.listings;
}

/**
 * Same as fetchListings, but returns null when the platform is unreachable so
 * pages can render a friendly fallback instead of erroring.
 */
export async function tryFetchListings(
  filters?: Parameters<typeof fetchListings>[0]
): Promise<PublicListing[] | null> {
  try {
    return await fetchListings(filters);
  } catch (error) {
    console.error("[site] listings unavailable", error);
    return null;
  }
}

/** Same as fetchListings, but a platform outage renders an empty list instead of a 500. */
export async function fetchListingsOrEmpty(
  filters?: Parameters<typeof fetchListings>[0]
): Promise<PublicListing[]> {
  return (await tryFetchListings(filters)) ?? [];
}

export async function fetchListing(slug: string): Promise<PublicListing | null> {
  const agency = await getSiteAgency();
  const res = await fetch(`${platformOrigin(agency)}${PUBLIC_API.listing(slug)}`, {
    headers: { [AGENCY_SLUG_HEADER]: agency.slug },
    next: { tags: ["listings", `agency:${agency.slug}`], revalidate: 60 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Listing ${slug} failed (${res.status})`);
  return res.json() as Promise<PublicListing>;
}

/** Platform login that lands on the renter or landlord portal after sign-in. */
export function portalLoginUrl(agency: Agency, portal: "/portal" | "/landlord-portal"): string {
  return `${platformOrigin(agency)}/login?next=${encodeURIComponent(portal)}`;
}

export function platformApiUrl(path: string, agency: Agency): string {
  return `${platformOrigin(agency)}${path}`;
}
