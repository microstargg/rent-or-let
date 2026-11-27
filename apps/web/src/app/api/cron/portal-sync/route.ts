import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api-auth";
import { getAgencyBySlug, listAgencySlugs, runWithAgencyAsync } from "@repo/config/server";
import { retryFailedPortalSyncs } from "@/lib/portals/retry";

/**
 * Retries listings whose last Rightmove/OnTheMarket send failed, for every agency.
 * Normal sends still happen straight away when a property is saved; this only
 * catches the ones that didn't get through.
 */
export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencies: Record<string, unknown> = {};
  for (const slug of listAgencySlugs()) {
    const agency = getAgencyBySlug(slug);
    if (!agency.runtime.databaseUrl) continue;
    try {
      agencies[slug] = await runWithAgencyAsync(agency, () => retryFailedPortalSyncs());
    } catch (err) {
      console.error(`[cron/portal-sync] ${slug} failed`, err);
      agencies[slug] = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  return NextResponse.json({ agencies });
}
