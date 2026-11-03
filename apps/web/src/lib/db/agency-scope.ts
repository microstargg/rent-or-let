import { cache } from "react";
import { eq } from "drizzle-orm";
import {
  getAgency,
  getAgencyOrNull,
  isAgencyContextLocked,
  type Agency,
} from "@repo/config/server";
import { bindRequestAgency } from "@/lib/agency";
import { ensureNotificationsSchema } from "./ensure-schema";

/** New columns (job assignee, notification prefs) must exist before any select on those tables. */
async function ensureLatestSchema(agency: Agency): Promise<void> {
  try {
    await ensureNotificationsSchema(agency);
  } catch (err) {
    console.error("[schema] notifications ensure failed", err);
  }
}

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
    const agency = getAgency();
    const slug = rememberAgencySlug(agency.slug);
    await ensureLatestSchema(agency);
    return slug;
  }
  const agency = await bindRequestAgency();
  const slug = rememberAgencySlug(agency.slug);
  await ensureLatestSchema(agency);
  return slug;
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
