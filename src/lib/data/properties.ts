import type { Property } from "@/types";
import {
  getAvailableProperties as dbGetAvailable,
  getPropertyBySlug as dbGetBySlug,
} from "@/lib/db/queries";

const seedProperties: Property[] = [
  {
    id: "seed-1",
    branch_id: "00000000-0000-0000-0000-000000000001",
    agent_ref: "PMS-001",
    slug: "ferndale-avenue-middlesbrough-ts3-9ds",
    display_address: "Ferndale Avenue, Middlesbrough, TS3 9DS",
    house_name_number: "",
    street: "Ferndale Avenue",
    town: "Middlesbrough",
    postcode: "TS3 9DS",
    price_pcm: 650,
    deposit: 750,
    available_from: new Date().toISOString().split("T")[0],
    bedrooms: 3,
    bathrooms: 1,
    property_type: "terraced",
    furnished: "part_furnished",
    status: "available",
    description:
      "Three bedroom terraced house available in Middlesbrough. Part furnished with good transport links and local amenities nearby.",
    summary: "3 bed terraced house, part furnished",
    features: ["Three bedrooms", "Part furnished", "Teesside location"],
    portal_sync: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  },
  {
    id: "seed-2",
    branch_id: "00000000-0000-0000-0000-000000000001",
    agent_ref: "PMS-002",
    slug: "howe-street-middlesbrough-ts1-4ld",
    display_address: "Howe Street, Middlesbrough, TS1 4LD",
    house_name_number: "",
    street: "Howe Street",
    town: "Middlesbrough",
    postcode: "TS1 4LD",
    price_pcm: 750,
    deposit: 865,
    available_from: new Date().toISOString().split("T")[0],
    bedrooms: 3,
    bathrooms: 1,
    property_type: "terraced",
    furnished: "furnished",
    status: "available",
    description:
      "Furnished three-bedroom terraced house. Rent £750.00 PCM. Bills not included.",
    summary: "Furnished 3 bed terraced house",
    features: ["Three bedrooms", "Fully furnished", "Central Middlesbrough"],
    portal_sync: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  },
];

function filterSeed(
  properties: Property[],
  filters?: { minBedrooms?: number; maxRent?: number; town?: string }
): Property[] {
  return properties.filter((p) => {
    if (filters?.minBedrooms && p.bedrooms < filters.minBedrooms) return false;
    if (filters?.maxRent && p.price_pcm > filters.maxRent) return false;
    if (filters?.town && !p.town.toLowerCase().includes(filters.town.toLowerCase()))
      return false;
    return true;
  });
}

export async function getAvailableProperties(filters?: {
  minBedrooms?: number;
  maxRent?: number;
  town?: string;
}): Promise<Property[]> {
  if (!process.env.DATABASE_URL) return filterSeed(seedProperties, filters);

  try {
    return await dbGetAvailable(filters);
  } catch {
    return filterSeed(seedProperties, filters);
  }
}

export async function getFeaturedProperties(limit = 3): Promise<Property[]> {
  const all = await getAvailableProperties();
  return all.slice(0, limit);
}

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  if (!process.env.DATABASE_URL) {
    return seedProperties.find((p) => p.slug === slug) ?? null;
  }

  try {
    const property = await dbGetBySlug(slug);
    return property ?? seedProperties.find((p) => p.slug === slug) ?? null;
  } catch {
    return seedProperties.find((p) => p.slug === slug) ?? null;
  }
}
