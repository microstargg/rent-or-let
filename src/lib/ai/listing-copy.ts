import { PORTAL_LIMITS } from "@/lib/portals/portal-readiness";
import { generateAiObject } from "./client";
import { z } from "zod";

const CopySchema = z.object({
  summary: z.string().max(PORTAL_LIMITS.summary),
  description: z.string().min(40).max(PORTAL_LIMITS.description),
});

export type ListingCopyInput = {
  displayAddress?: string;
  town: string;
  postcode?: string;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
  furnished: string;
  pricePcm: number;
  features: string[];
};

export async function generateListingCopy(input: ListingCopyInput) {
  return generateAiObject({
    schema: CopySchema,
    system:
      "You write UK letting-agency listing copy for Teesside / North East England. " +
      "Do not invent amenities, nearby schools, or EPC ratings. Do not use discriminatory phrases " +
      "(no DSS, professionals only, no children, no pets). British English. No hashtags.",
    prompt: [
      "Write a portal summary (max 300 characters) and a longer description.",
      `Town: ${input.town}`,
      input.postcode ? `Postcode: ${input.postcode}` : "",
      input.displayAddress ? `Address: ${input.displayAddress}` : "",
      `Type: ${input.propertyType.replaceAll("_", " ")}`,
      `Bedrooms: ${input.bedrooms}`,
      `Bathrooms: ${input.bathrooms}`,
      `Furnished: ${input.furnished.replaceAll("_", " ")}`,
      `Rent: £${input.pricePcm} pcm`,
      input.features.length ? `Features:\n- ${input.features.join("\n- ")}` : "No feature list supplied.",
    ]
      .filter(Boolean)
      .join("\n"),
  });
}
