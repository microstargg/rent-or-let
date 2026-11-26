import { z } from "zod";

/**
 * Lettings details that Rightmove and OnTheMarket ask for alongside the core listing
 * (let type, minimum term, council tax band, pets, bills and the "Tenancy info" box).
 * Stored in properties.metadata.listing so no new columns are needed.
 */
export const LET_TYPES = [
  { value: "long_term", label: "Long term" },
  { value: "short_term", label: "Short term" },
  { value: "student", label: "Student" },
] as const;

export const COUNCIL_TAX_BANDS = ["A", "B", "C", "D", "E", "F", "G", "H", "Exempt"] as const;

export const PETS_OPTIONS = [
  { value: "considered", label: "Considered" },
  { value: "yes", label: "Allowed" },
  { value: "no", label: "Not allowed" },
] as const;

/** Rightmove's limit for the lettings "Tenancy info" box. */
export const TENANCY_INFO_MAX = 4000;

export const listingDetailsSchema = z.object({
  letType: z.enum(["long_term", "short_term", "student"]).nullable().optional(),
  minTenancyMonths: z.number().int().min(0).max(60).nullable().optional(),
  councilTaxBand: z.enum(COUNCIL_TAX_BANDS).nullable().optional(),
  pets: z.enum(["considered", "yes", "no"]).nullable().optional(),
  billsIncluded: z.boolean().optional(),
  tenancyInfo: z.string().max(TENANCY_INFO_MAX).nullable().optional(),
});

export type ListingDetails = z.infer<typeof listingDetailsSchema>;

/** Read listing details from a property's metadata, ignoring anything malformed. */
export function listingDetailsFromMetadata(metadata: unknown): ListingDetails {
  const raw = (metadata as { listing?: unknown } | null | undefined)?.listing;
  const parsed = listingDetailsSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}
