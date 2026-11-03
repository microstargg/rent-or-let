import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api-auth";
import { getDefaultBranch, refreshComplianceStatuses } from "@/lib/db/queries";
import { runDailyNotifications } from "@/lib/notifications/digest";
import {
  getAgencyBySlug,
  listAgencySlugs,
  runWithAgencyAsync,
} from "@repo/config/server";

/**
 * Daily at 07:00 UTC: refresh certificate statuses, then in-app notifications
 * and each staff member's morning email (see lib/notifications/digest.ts).
 */
export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencies = [];
  for (const slug of listAgencySlugs()) {
    const agency = getAgencyBySlug(slug);
    if (!agency.runtime.databaseUrl) continue;
    try {
      const result = await runWithAgencyAsync(agency, async () => {
        const branch = await getDefaultBranch();
        if (!branch) return { error: "No branch" as const };
        const refreshed = await refreshComplianceStatuses(branch.id);
        const notifications = await runDailyNotifications(branch.id, refreshed.changed);
        return {
          updated: refreshed.updated,
          tasksCreated: refreshed.tasksCreated,
          ...notifications,
        };
      });
      agencies.push({ slug, ...result });
    } catch (err) {
      console.error(`[cron/compliance] ${slug} failed`, err);
      agencies.push({ slug, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ ok: true, agencies });
}
