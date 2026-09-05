import { cache } from "react";
import { headers } from "next/headers";
import { fallbackAgencySlug, AGENCY_SLUG_HEADER } from "@repo/config/host";
import {
  bindAgency,
  getAgencyBySlug,
  getAgencyOrNull,
  resolveAgencySlug,
  type Agency,
} from "@repo/config/server";

export const bindRequestAgency = cache(async (): Promise<Agency> => {
  const existing = getAgencyOrNull();
  if (existing) return existing;

  try {
    const h = await headers();
    const slug = resolveAgencySlug(
      h.get("x-forwarded-host") ?? h.get("host"),
      h.get(AGENCY_SLUG_HEADER)
    );
    const agency = getAgencyBySlug(slug);
    bindAgency(agency);
    return agency;
  } catch {
    const agency = getAgencyBySlug(fallbackAgencySlug());
    bindAgency(agency);
    return agency;
  }
});

export function bindAgencyFromRequest(request: Request): Agency {
  const existing = getAgencyOrNull();
  if (existing) return existing;
  const url = new URL(request.url);
  const slug = resolveAgencySlug(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    request.headers.get(AGENCY_SLUG_HEADER) ?? url.searchParams.get("agency")
  );
  const agency = getAgencyBySlug(slug);
  bindAgency(agency);
  return agency;
}
