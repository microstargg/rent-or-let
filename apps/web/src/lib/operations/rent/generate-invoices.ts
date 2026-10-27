import {
  getActiveTenanciesForRent,
  getExistingRentInvoicesForDueDate,
  createInvoices,
} from "@/lib/db/queries";

export function rentDueDateForPeriodStart(periodStart: string): string {
  const start = new Date(periodStart);
  const due = new Date(start);
  due.setMonth(due.getMonth() + 1);
  return due.toISOString().slice(0, 10);
}

export async function generateRentInvoicesForBranch(
  branchId: string,
  periodStart: string
): Promise<{ created: number }> {
  const dueDate = rentDueDateForPeriodStart(periodStart);
  // Only tenancies running on the due date: not yet started or already ended get no rent.
  const tenancyList = (await getActiveTenanciesForRent(branchId)).filter(
    (t) => t.startDate <= dueDate && (!t.endDate || t.endDate >= dueDate)
  );
  if (tenancyList.length === 0) return { created: 0 };

  const tenancyIds = tenancyList.map((t) => t.id);
  const existing = await getExistingRentInvoicesForDueDate(branchId, dueDate, tenancyIds);
  const already = new Set(existing.map((r) => r.tenancyId));

  const rows = tenancyList
    .filter((t) => !already.has(t.id))
    .map((t) => ({
      branchId,
      tenancyId: t.id,
      type: "rent",
      dueDate,
      amount: Number(t.rentAmount),
      status: "due",
    }));

  if (rows.length === 0) return { created: 0 };
  await createInvoices(rows);
  return { created: rows.length };
}

/**
 * Raise next month's rent, and this month's too if an earlier run was missed.
 * Safe to run repeatedly: invoices already raised for a due date are skipped.
 */
export async function raiseRentInvoices(
  branchId: string,
  now = new Date()
): Promise<{ created: number }> {
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const previousStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const catchUp = await generateRentInvoicesForBranch(
    branchId,
    previousStart.toISOString().slice(0, 10)
  );
  const next = await generateRentInvoicesForBranch(
    branchId,
    periodStart.toISOString().slice(0, 10)
  );
  return { created: catchUp.created + next.created };
}
