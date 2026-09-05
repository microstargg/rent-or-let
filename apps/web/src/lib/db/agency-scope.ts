import { eq } from "drizzle-orm";
import {
  getAgency,
  getAgencyOrNull,
  isAgencyContextLocked,
} from "@repo/config/server";
import { bindRequestAgency } from "@/lib/agency";

/**
 * Bind this async context to the request host (or keep a locked cron/script agency).
 * Staff RSC pages render in parallel with the layout, so queries must call this
 * themselves — layout `enterWith` does not reach the page.
 */
export async function ensureAgency(): Promise<string> {
  if (isAgencyContextLocked()) return getAgency().slug;
  const agency = await bindRequestAgency();
  return agency.slug;
}

export function currentAgencyId(): string {
  const bound = getAgencyOrNull();
  if (bound) return bound.slug;
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
