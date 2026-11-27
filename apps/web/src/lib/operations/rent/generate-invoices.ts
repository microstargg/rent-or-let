import {
  getActiveTenanciesForRent,
  getExistingRentInvoicesBetween,
  createInvoices,
} from "@/lib/db/queries";
import {
  RENT_CATCH_UP_DAYS,
  addDaysIso,
  londonToday,
  parseRentSchedule,
  rentDueDatesBetween,
  rentLookaheadDays,
} from "@/lib/finance/rent-schedule";

/**
 * Raise every rent invoice that falls due from a month ago up to each tenancy's
 * look-ahead (a month for monthly rent, two weeks for weekly, fortnightly and
 * four-weekly). Runs every morning; safe to run repeatedly, because a due date that
 * already has a rent invoice for the tenancy is skipped.
 */
export async function raiseRentInvoices(
  branchId: string,
  now = new Date()
): Promise<{ created: number }> {
  const today = londonToday(now);
  const windowFrom = addDaysIso(today, -RENT_CATCH_UP_DAYS);
  const windowTo = addDaysIso(today, Math.max(rentLookaheadDays("monthly"), rentLookaheadDays("weekly")));

  const tenancyList = await getActiveTenanciesForRent(branchId);
  if (tenancyList.length === 0) return { created: 0 };

  const existing = await getExistingRentInvoicesBetween(
    branchId,
    windowFrom,
    windowTo,
    tenancyList.map((t) => t.id)
  );
  const already = new Set(existing.map((r) => `${r.tenancyId}|${r.dueDate}`));

  const rows: Parameters<typeof createInvoices>[0] = [];
  for (const t of tenancyList) {
    const schedule = parseRentSchedule(t);
    const to = addDaysIso(today, rentLookaheadDays(schedule.frequency));
    for (const dueDate of rentDueDatesBetween(schedule, t.startDate, windowFrom, to)) {
      // Only while the tenancy runs: not before it starts or after it ends.
      if (dueDate < t.startDate || (t.endDate && dueDate > t.endDate)) continue;
      const key = `${t.id}|${dueDate}`;
      if (already.has(key)) continue;
      already.add(key);
      rows.push({
        branchId,
        tenancyId: t.id,
        type: "rent",
        dueDate,
        amount: Number(t.rentAmount),
        status: "due",
      });
    }
  }

  if (rows.length === 0) return { created: 0 };
  await createInvoices(rows);
  return { created: rows.length };
}
