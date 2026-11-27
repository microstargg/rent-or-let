import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../index";
import { agencyEq, ensureAgency } from "../agency-scope";
import { invoices, ledgerEntries, paymentAllocations, tenancies } from "../schema";
import type { RentFrequency } from "@/lib/finance/rent-schedule";

/**
 * Change how often a tenancy pays, from which due date, and how much each rent is.
 *
 * Rent already raised for after today (or from the new start date) that nobody has
 * paid anything against is taken off, so the daily run raises it again on the new
 * schedule. Rent that is due already, or has money against it, is left alone.
 */
export async function saveRentSchedule(
  tenancyId: string,
  data: { frequency: RentFrequency; from: string; rentAmount: number; today: string }
) {
  await ensureAgency();
  const [tenancy] = await db
    .select({ id: tenancies.id, metadata: tenancies.metadata })
    .from(tenancies)
    .where(and(eq(tenancies.id, tenancyId), agencyEq(tenancies.agencyId)))
    .limit(1);
  if (!tenancy) return null;

  const metadata = {
    ...((tenancy.metadata ?? {}) as Record<string, unknown>),
    rent_schedule: { from: data.from, set_on: data.today },
  };
  const [row] = await db
    .update(tenancies)
    .set({ rentFrequency: data.frequency, rentAmount: String(data.rentAmount), metadata })
    .where(and(eq(tenancies.id, tenancyId), agencyEq(tenancies.agencyId)))
    .returning();

  const candidates = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(
      and(
        eq(invoices.tenancyId, tenancyId),
        agencyEq(invoices.agencyId),
        eq(invoices.type, "rent"),
        eq(invoices.status, "due"),
        sql`(${invoices.dueDate} > ${data.today} or ${invoices.dueDate} >= ${data.from})`,
        sql`coalesce(${invoices.meta}->>'opening_balance', '') <> 'true'`
      )
    );
  let removed = 0;
  if (candidates.length) {
    const ids = candidates.map((c) => c.id);
    const touched = await db
      .select({ invoiceId: paymentAllocations.invoiceId })
      .from(paymentAllocations)
      .where(and(inArray(paymentAllocations.invoiceId, ids), agencyEq(paymentAllocations.agencyId)));
    const keep = new Set(touched.map((t) => t.invoiceId));
    const drop = ids.filter((id) => !keep.has(id));
    if (drop.length) {
      await db
        .delete(ledgerEntries)
        .where(
          and(
            inArray(ledgerEntries.invoiceId, drop),
            eq(ledgerEntries.entryType, "charge"),
            agencyEq(ledgerEntries.agencyId)
          )
        );
      await db.delete(invoices).where(and(inArray(invoices.id, drop), agencyEq(invoices.agencyId)));
      removed = drop.length;
    }
  }

  return { tenancy: row ?? null, removed };
}
