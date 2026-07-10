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
  const tenancyList = await getActiveTenanciesForRent(branchId);
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
