import type { Property, PropertyImage } from "@/types";
import {
  getAvailableProperties as dbGetAvailable,
  getPropertyBySlug as dbGetBySlug,
} from "@/lib/db/queries";

const FERNDALE_SLUG = "ferndale-avenue-middlesbrough-ts3-9ds";
const HOWE_STREET_SLUG = "howe-street-middlesbrough-ts1-4ld";

function propertyImages(
  propertyId: string,
  slug: string,
  count: number,
  displayAddress: string
): PropertyImage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${propertyId}-img-${index + 1}`,
    property_id: propertyId,
    url: `/properties/${slug}/${String(index + 1).padStart(2, "0")}.jpg`,
    alt_text: displayAddress,
    sort_order: index,
    is_primary: index === 0,
  }));
}

const seedProperties: Property[] = [
  {
    id: "seed-1",
    branch_id: "00000000-0000-0000-0000-000000000001",
    agent_ref: "PMS-001",
    slug: FERNDALE_SLUG,
    display_address: "Ferndale Avenue, Middlesbrough, TS3 9DS",
    house_name_number: "",
    street: "Ferndale Avenue",
    town: "Middlesbrough",
    postcode: "TS3 9DS",
    price_pcm: 650,
    deposit: 650,
    available_from: "2026-04-13",
    bedrooms: 3,
    bathrooms: 1,
    property_type: "terraced",
    furnished: "part_furnished",
    status: "available",
    description: `This property benefits from double glazing, gas central heating, very good carpets/flooring, fitted blinds & good decoration throughout.

The ground floor briefly comprises a hall/lobby, a large through lounge with French doors leading out to the rear patio/garden area, and a modern fitted oak kitchen, black worktops and a built-in oven/hob. On the first floor are three bedrooms and a family bathroom with a shower over the bath. Driveway to the front and patio/garden area to the rear of the property.

The bond is £650.00, and references are required.

Council Tax band A
EPC Rating – TBC`,
    summary: "£650.00 Per Calendar Month, 3 Bedroom Terraced House, Part Furnished.",
    features: [
      "Double glazing",
      "Gas central heating",
      "Part furnished",
      "Through lounge with French doors to rear garden",
      "Modern fitted kitchen with built-in oven/hob",
      "Three bedrooms",
      "Family bathroom with shower over bath",
      "Driveway to front",
      "Patio/garden to rear",
      "Council Tax band A",
    ],
    epc_rating: "TBC",
    portal_sync: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    images: propertyImages("seed-1", FERNDALE_SLUG, 7, "Ferndale Avenue, Middlesbrough, TS3 9DS"),
  },
  {
    id: "seed-2",
    branch_id: "00000000-0000-0000-0000-000000000001",
    agent_ref: "PMS-002",
    slug: HOWE_STREET_SLUG,
    display_address: "Howe Street, Middlesbrough, TS1 4LD",
    house_name_number: "",
    street: "Howe Street",
    town: "Middlesbrough",
    postcode: "TS1 4LD",
    price_pcm: 750,
    deposit: 750,
    available_from: "2026-04-13",
    bedrooms: 3,
    bathrooms: 1,
    property_type: "terraced",
    furnished: "furnished",
    status: "available",
    description: `FURNISHED THREE-BEDROOM TERRACED HOUSE

Rent £750.00 PCM

*BILLS NOT INCLUDED*

The deposit is £750.00, or a guarantor is required with references.

This property is of a good standard and benefits from double glazing, gas central heating, stylish decoration, blinds, wooden flooring, kitchen appliances, furniture, a flat-screen TV, a leather sofa, beds, and lots of extra storage space.

EPC rating D

Council Tax Band A`,
    summary: "Furnished three-bedroom terraced house — £750 PCM (bills not included)",
    features: [
      "Fully furnished",
      "Double glazing",
      "Gas central heating",
      "Wooden flooring",
      "Kitchen appliances included",
      "Flat-screen TV, leather sofa and beds",
      "Extra storage space",
      "Bills not included",
      "Council Tax Band A",
      "EPC rating D",
    ],
    epc_rating: "D",
    portal_sync: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    images: propertyImages("seed-2", HOWE_STREET_SLUG, 6, "Howe Street, Middlesbrough, TS1 4LD"),
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
