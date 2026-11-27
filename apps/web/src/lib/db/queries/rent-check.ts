import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "../index";
import { agencyEq, ensureAgency } from "../agency-scope";
import { bankTransactions, invoices, paymentAllocations, properties, renters, tenancies } from "../schema";
import { ensureBankFeed } from "./bank-feed";
import { getPaymentRefFromMetadata } from "@/lib/payment-ref";

export interface RentCheckRow {
  invoiceId: string;
  tenancyId: string;
  dueDate: string;
  amount: number;
  outstanding: number;
  status: string;
  renterName: string;
  propertyAddress: string;
  paymentRef: string | null;
  frequency: string;
  /** Paid, and the bank statement backs it up. */
  bankConfirmed: boolean;
}

/**
 * The daily rent check: rent due today (paid or not, so staff see their progress) and
 * rent from earlier days that nobody has marked as received yet.
 * Opening arrears from a previous agent aren't rent falling due, so they're left out.
 */
export async function getRentCheck(branchId: string, today: string) {
  await Promise.all([ensureAgency(), ensureBankFeed()]);
  const rows = await db
    .select({
      invoiceId: invoices.id,
      tenancyId: invoices.tenancyId,
      dueDate: invoices.dueDate,
      amount: invoices.amount,
      status: invoices.status,
      renterFirstName: renters.firstName,
      renterLastName: renters.lastName,
      propertyAddress: properties.displayAddress,
      tenancyMetadata: tenancies.metadata,
      frequency: tenancies.rentFrequency,
    })
    .from(invoices)
    .innerJoin(tenancies, eq(invoices.tenancyId, tenancies.id))
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .innerJoin(renters, eq(tenancies.primaryRenterId, renters.id))
    .where(
      and(
        eq(invoices.branchId, branchId),
        agencyEq(invoices.agencyId),
        eq(invoices.type, "rent"),
        lte(invoices.dueDate, today),
        sql`coalesce(${invoices.meta}->>'opening_balance', '') <> 'true'`,
        sql`(${invoices.status} in ('due', 'partial') or (${invoices.dueDate} = ${today} and ${invoices.status} = 'paid'))`
      )
    )
    .orderBy(asc(invoices.dueDate), asc(properties.displayAddress));

  const ids = rows.map((r) => r.invoiceId);
  const paid = new Map<string, number>();
  const confirmed = new Set<string>();
  if (ids.length) {
    const [sums, linked] = await Promise.all([
      db
        .select({
          invoiceId: paymentAllocations.invoiceId,
          total: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)`,
        })
        .from(paymentAllocations)
        .where(and(inArray(paymentAllocations.invoiceId, ids), agencyEq(paymentAllocations.agencyId)))
        .groupBy(paymentAllocations.invoiceId),
      db
        .selectDistinct({ invoiceId: paymentAllocations.invoiceId })
        .from(paymentAllocations)
        .innerJoin(bankTransactions, eq(bankTransactions.paymentId, paymentAllocations.paymentId))
        .where(and(inArray(paymentAllocations.invoiceId, ids), agencyEq(paymentAllocations.agencyId))),
    ]);
    for (const r of sums) paid.set(r.invoiceId, Number(r.total));
    for (const r of linked) confirmed.add(r.invoiceId);
  }

  const all: RentCheckRow[] = rows
    .filter((r): r is typeof r & { tenancyId: string } => Boolean(r.tenancyId))
    .map((r) => ({
      invoiceId: r.invoiceId,
      tenancyId: r.tenancyId,
      dueDate: r.dueDate,
      amount: Number(r.amount),
      outstanding:
        r.status === "paid" ? 0 : Math.max(0, Math.round((Number(r.amount) - (paid.get(r.invoiceId) ?? 0)) * 100) / 100),
      status: r.status,
      renterName: `${r.renterFirstName} ${r.renterLastName}`.trim(),
      propertyAddress: r.propertyAddress,
      paymentRef: getPaymentRefFromMetadata(r.tenancyMetadata),
      frequency: r.frequency,
      bankConfirmed: r.status === "paid" && confirmed.has(r.invoiceId),
    }));

  const dueToday = all.filter((r) => r.dueDate === today);
  const overdue = all.filter((r) => r.dueDate < today && r.status !== "paid");
  return {
    dueToday,
    overdue,
    dueTodayTotal: dueToday.reduce((s, r) => s + r.amount, 0),
    receivedToday: dueToday.filter((r) => r.status === "paid").length,
    overdueTotal: overdue.reduce((s, r) => s + r.outstanding, 0),
  };
}

export type RentCheck = Awaited<ReturnType<typeof getRentCheck>>;

/** Payments staff marked as received by hand (not from a bank import). */
export function isHandTickedPayment(p: { method: string; externalRef: string | null; amount: string | number }) {
  return p.method === "bank_transfer" && !p.externalRef && Number(p.amount) > 0;
}

