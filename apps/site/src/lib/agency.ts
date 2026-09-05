import { cache } from "react";
import { headers } from "next/headers";
import { AGENCY_SLUG_HEADER } from "@repo/config/host";
import {
  getAgencyBySlug,
  platformUrlFor,
  resolveAgencySlug,
  type Agency,
} from "@repo/config/runtime";

export const getSiteAgency = cache(async (): Promise<Agency> => {
  const h = await headers();
  const headerSlug = h.get(AGENCY_SLUG_HEADER);
  if (headerSlug) return getAgencyBySlug(headerSlug);
  const slug = resolveAgencySlug(
    h.get("x-forwarded-host") ?? h.get("host"),
    headerSlug
  );
  return getAgencyBySlug(slug);
});

export function platformOrigin(agency: Agency): string {
  return platformUrlFor(agency);
}
