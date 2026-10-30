import { and, count, eq, isNotNull, lt } from "drizzle-orm";
import { db } from "../index";
import { agencyEq, ensureAgency } from "../agency-scope";
import { complaints, cookieConsents, enquiries, tenantApplications } from "../schema";

/**
 * Default retention periods, matching the agency privacy notice and
 * docs/legal/retention-schedule.md. Change both together.
 */
export const RETENTION_RULES = [
  { key: "enquiries", label: "Enquiries", months: 12 },
  { key: "rejectedApplications", label: "Unsuccessful applications", months: 6 },
  { key: "closedComplaints", label: "Resolved complaints", months: 72 },
  { key: "cookieConsents", label: "Cookie consent records", months: 24 },
] as const;

export type RetentionKey = (typeof RETENTION_RULES)[number]["key"];

function monthsAgo(months: number, now: Date): Date {
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return d;
}

function conditions(key: RetentionKey, cutoff: Date) {
  switch (key) {
    case "enquiries":
      return { table: enquiries, where: and(agencyEq(enquiries.agencyId), lt(enquiries.createdAt, cutoff)) };
    case "rejectedApplications":
      return {
        table: tenantApplications,
        where: and(
          agencyEq(tenantApplications.agencyId),
          eq(tenantApplications.status, "rejected"),
          lt(tenantApplications.createdAt, cutoff)
        ),
      };
    case "closedComplaints":
      return {
        table: complaints,
        where: and(
          agencyEq(complaints.agencyId),
          isNotNull(complaints.resolvedAt),
          lt(complaints.resolvedAt, cutoff)
        ),
      };
    case "cookieConsents":
      return {
        table: cookieConsents,
        where: and(agencyEq(cookieConsents.agencyId), lt(cookieConsents.createdAt, cutoff)),
      };
  }
}

/**
 * Count (dryRun) or delete rows past their retention period for the current agency.
 * Deletion cannot be undone, so callers must only pass dryRun: false for agencies
 * that have agreed their periods.
 */
export async function applyRetention(opts: { dryRun: boolean; now?: Date }) {
  await ensureAgency();
  const now = opts.now ?? new Date();
  const results: Record<RetentionKey, number> = {
    enquiries: 0,
    rejectedApplications: 0,
    closedComplaints: 0,
    cookieConsents: 0,
  };

  for (const rule of RETENTION_RULES) {
    const { table, where } = conditions(rule.key, monthsAgo(rule.months, now));
    if (opts.dryRun) {
      const [row] = await db.select({ n: count() }).from(table).where(where);
      results[rule.key] = Number(row?.n ?? 0);
    } else {
      const deleted = await db.delete(table).where(where).returning({ id: table.id });
      results[rule.key] = deleted.length;
    }
  }

  return results;
}
