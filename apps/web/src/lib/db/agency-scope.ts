import { cache } from "react";
import { eq } from "drizzle-orm";
import {
  getAgency,
  getAgencyOrNull,
  isAgencyContextLocked,
} from "@repo/config/server";
import { bindRequestAgency } from "@/lib/agency";

/**
 * Per-request slug store. `enterWith` does not survive Next.js RSC awaits, so
 * `ensureAgency` writes here and `currentAgencyId` reads it in the same request.
 */
const requestAgencyRef = cache((): { slug: string | null } => ({ slug: null }));

function rememberAgencySlug(slug: string): string {
  try {
    requestAgencyRef().slug = slug;
  } catch {
    // Scripts / non-React callers have no request cache.
  }
  return slug;
}

/**
 * Bind this request to the host-derived agency (or keep a locked cron/script agency).
 * Staff RSC pages render in parallel with the layout, so queries must call this
 * themselves — layout `enterWith` does not reach the page.
 */
export async function ensureAgency(): Promise<string> {
  if (isAgencyContextLocked()) {
    return rememberAgencySlug(getAgency().slug);
  }
  const agency = await bindRequestAgency();
  return rememberAgencySlug(agency.slug);
}

export function currentAgencyId(): string {
  const fromAls = getAgencyOrNull()?.slug;
  if (fromAls) return fromAls;
  try {
    const cached = requestAgencyRef().slug;
    if (cached) return cached;
  } catch {
    // Not in a React request cache.
  }
  if (process.env.NEXT_RUNTIME || process.env.VERCEL) {
    throw new Error(
      "Agency context is not bound. Call ensureAgency() before querying so tenants cannot see each other's data."
    );
  }
  return getAgency().slug;
}

/** Convenience: eq(column, current agency slug) */
export function agencyEq(column: Parameters<typeof eq>[0]) {
  return eq(column, currentAgencyId());
}
