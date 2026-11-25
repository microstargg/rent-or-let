import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api-auth";
import { getDefaultBranch, refreshComplianceStatuses } from "@/lib/db/queries";
import { runDailyNotifications } from "@/lib/notifications/digest";
import { sendArrearsReminders } from "@/lib/finance/arrears-reminders";
import { sendViewingReminders } from "@/lib/lettings/viewing-messages";
import {
  getAgencyBySlug,
  listAgencySlugs,
  runWithAgencyAsync,
} from "@repo/config/server";

/**
 * Daily at 07:00 UTC: refresh certificate statuses, then in-app notifications
 * and each staff member's morning email (see lib/notifications/digest.ts), then
 * tenant arrears reminders when the agency has them switched on, then
 * day-before reminders for viewings.
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
        let arrearsReminders: unknown = null;
        try {
          arrearsReminders = await sendArrearsReminders(branch.id);
        } catch (err) {
          console.error(`[cron/compliance] ${slug} arrears reminders failed`, err);
          arrearsReminders = { error: err instanceof Error ? err.message : String(err) };
        }
        let viewingReminders: unknown = null;
        try {
          viewingReminders = await sendViewingReminders(branch.id);
        } catch (err) {
          console.error(`[cron/compliance] ${slug} viewing reminders failed`, err);
          viewingReminders = { error: err instanceof Error ? err.message : String(err) };
        }
        return {
          arrearsReminders,
          viewingReminders,
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
