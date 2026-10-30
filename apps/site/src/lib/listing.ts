import type { PublicListing } from "@repo/site-core";

function startOfTomorrow(now: Date = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

/** True when the listing's availableFrom date is today or already past (or missing). */
export function isAvailableNow(listing: Pick<PublicListing, "availableFrom">, now?: Date): boolean {
  if (!listing.availableFrom) return true;
  const from = new Date(listing.availableFrom);
  if (Number.isNaN(from.getTime())) return true;
  return from < startOfTomorrow(now);
}

/** "Available now", or "From 12 Dec" for a future date. */
export function availabilityLabel(listing: Pick<PublicListing, "availableFrom">, now?: Date): string {
  if (isAvailableNow(listing, now)) return "Available now";
  const from = new Date(listing.availableFrom);
  return `From ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(from)}`;
}

/** "part_furnished" → "Part furnished". */
export function furnishedLabel(value?: string): string | null {
  if (!value) return null;
  const text = value.replace(/[_-]/g, " ").trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : null;
}

/** Short street + outward postcode for cards, e.g. "Howe Street, Middlesbrough TS1". */
export function shortAddress(listing: Pick<PublicListing, "displayAddress" | "postcode">): string {
  const outward = listing.postcode?.trim().split(/\s+/)[0];
  if (!outward) return listing.displayAddress;
  const parts = listing.displayAddress
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && part.replace(/\s/g, "").toUpperCase() !== listing.postcode.replace(/\s/g, "").toUpperCase());
  return `${parts.join(", ")} ${outward}`;
}

export function primaryFirstImages(listing: Pick<PublicListing, "images">) {
  return [...listing.images].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
}

export type ListingSort = "price_asc" | "price_desc";

export function sortListings<T extends Pick<PublicListing, "pricePcm">>(listings: T[], sort?: string): T[] {
  if (sort === "price_asc") return [...listings].sort((a, b) => a.pricePcm - b.pricePcm);
  if (sort === "price_desc") return [...listings].sort((a, b) => b.pricePcm - a.pricePcm);
  return listings;
}
