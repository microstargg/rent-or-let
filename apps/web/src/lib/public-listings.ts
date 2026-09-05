import { getAgency } from "@repo/config/server";
import type { PublicListing } from "@repo/site-core";
import type { Property } from "@/types";

export function toPublicListing(property: Property): PublicListing {
  return {
    id: property.id,
    slug: property.slug,
    displayAddress: property.display_address,
    street: property.street,
    town: property.town,
    postcode: property.postcode,
    pricePcm: property.price_pcm,
    deposit: property.deposit,
    holdingDeposit: property.holding_deposit,
    availableFrom: property.available_from,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    propertyType: property.property_type,
    furnished: property.furnished,
    description: property.description,
    summary: property.summary,
    features: property.features,
    epcRating: property.epc_rating,
    virtualTourUrl: property.virtual_tour_url,
    floorplanUrl: property.floorplan_url,
    epcUrl: property.epc_url,
    images: (property.images ?? []).map((image) => ({
      url: image.url,
      altText: image.alt_text,
      sortOrder: image.sort_order,
      isPrimary: image.is_primary,
    })),
  };
}

export async function notifySiteRevalidate(paths: string[] = ["/properties", "/"]) {
  const agency = getAgency();
  const url = agency.runtime.revalidateUrl;
  const secret = agency.runtime.revalidateSecret;
  if (!url || !secret) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ paths }),
    });
  } catch (error) {
    console.error("[revalidate] failed to ping public site", error);
  }
}
