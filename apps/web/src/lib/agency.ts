import { cache } from "react";
import { headers } from "next/headers";
import { AGENCY_SLUG_HEADER } from "@repo/config/host";
import {
  bindAgency,
  getAgency,
  getAgencyBySlug,
  isAgencyContextLocked,
  openAgencySlot,
  resolveAgencySlug,
  type Agency,
} from "@repo/config/server";

/**
 * Resolve the agency from this request's Host / x-agency-slug.
 * Cached per RSC request so layout + page share one lookup.
 * Binding (ALS enterWith) is intentionally NOT cached: Next.js renders
 * layout and page in parallel async contexts, so each caller must re-enter.
 */
const resolveRequestAgency = cache(async (): Promise<Agency> => {
  const h = await headers();
  const slug = resolveAgencySlug(
    h.get("x-forwarded-host") ?? h.get("host"),
    h.get(AGENCY_SLUG_HEADER)
  );
  return getAgencyBySlug(slug);
});

export async function bindRequestAgency(): Promise<Agency> {
  if (isAgencyContextLocked()) return getAgency();
  // Must run before the await so the slot lands in the caller's context.
  const slot = openAgencySlot();
  const agency = await resolveRequestAgency();
  slot.agency = agency;
  return agency;
}

export function bindAgencyFromRequest(request: Request): Agency {
  if (isAgencyContextLocked()) return getAgency();
  const url = new URL(request.url);
  const slug = resolveAgencySlug(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    request.headers.get(AGENCY_SLUG_HEADER) ?? url.searchParams.get("agency")
  );
  const agency = getAgencyBySlug(slug);
  bindAgency(agency);
  return agency;
}
