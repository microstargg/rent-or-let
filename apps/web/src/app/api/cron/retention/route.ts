import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api-auth";
import { applyRetention } from "@/lib/db/queries/retention";
import { getAgencyBySlug, listAgencySlugs, runWithAgencyAsync } from "@repo/config/server";

/**
 * Deletes personal data past its retention period. Every agency runs as a dry run
 * (counts only) unless its slug is listed in RETENTION_ENFORCE_AGENCIES, because
 * deletion cannot be undone and each agency must agree its periods first.
 */
function enforcedAgencies(): Set<string> {
  return new Set(
    (process.env.RETENTION_ENFORCE_AGENCIES ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enforced = enforcedAgencies();
  const agencies = [];
  for (const slug of listAgencySlugs()) {
    const agency = getAgencyBySlug(slug);
    if (!agency.runtime.databaseUrl) continue;
    const dryRun = !enforced.has(slug);
    const result = await runWithAgencyAsync(agency, () => applyRetention({ dryRun }));
    agencies.push({ slug, dryRun, ...result });
  }

  return NextResponse.json({ ok: true, agencies });
}
