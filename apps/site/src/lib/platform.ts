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

export function platformApiUrl(path: string, agency: Agency): string {
  return `${platformOrigin(agency)}${path}`;
}
