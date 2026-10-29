import { and, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { db } from "../index";
import { agencyEq } from "../agency-scope";
import { ensureBankFeed } from "./bank-feed";
import {
  bankTransactions,
  contractors,
  invoices,
  landlordPayouts,
  landlordStatements,
  landlords,
  paymentAllocations,
  paymentExceptions,
  properties,
  renters,
  tenancies,
  tickets,
  workOrders,
} from "../schema";
import { listLandlordBalances } from "./landlord-finance";
import { listExpectedOutgoings } from "@/lib/bank-feed/match-outgoing";
import { workOrderContractorCost } from "@/lib/operations/maintenance/work-order-invoice";
import { ensureJobInvoiceSchema } from "@/lib/db/ensure-schema";

export interface MonthPeriod {
  month: string;
  from: string;
  to: string;
}

/** "2026-10" → 1st to last day of that month. Falls back to the current month. */
export function monthPeriod(month?: string | null): MonthPeriod {
  const valid = month && /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  const [y, m] = valid.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { month: valid, from: `${valid}-01`, to: `${valid}-${String(last).padStart(2, "0")}` };
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

function dayStart(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}
function dayEnd(iso: string) {
  return new Date(`${iso}T23:59:59.999Z`);
}

export async function getMonthEndOverview(branchId: string, period: MonthPeriod) {
  await ensureBankFeed();
  await ensureJobInvoiceSchema();
  const from = dayStart(period.from);
  const to = dayEnd(period.to);

  // 1. Rent due this month vs received.
  const paidSub = db
    .select({
      invoiceId: paymentAllocations.invoiceId,
      paid: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)`.as("paid"),
    })
    .from(paymentAllocations)
    .groupBy(paymentAllocations.invoiceId)
    .as("paid_sub");

  const rentRows = await db
    .select({
      invoiceId: invoices.id,
      tenancyId: invoices.tenancyId,
      dueDate: invoices.dueDate,
      amount: invoices.amount,
      paid: paidSub.paid,
      propertyAddress: properties.displayAddress,
      renterFirstName: renters.firstName,
      renterLastName: renters.lastName,
    })
    .from(invoices)
    .leftJoin(paidSub, eq(paidSub.invoiceId, invoices.id))
    .leftJoin(tenancies, eq(invoices.tenancyId, tenancies.id))
    .leftJoin(properties, eq(tenancies.propertyId, properties.id))
    .leftJoin(renters, eq(tenancies.primaryRenterId, renters.id))
    .where(
      and(
        eq(invoices.branchId, branchId),
        agencyEq(invoices.agencyId),
        inArray(invoices.type, ["rent", "late_fee"]),
        gte(invoices.dueDate, period.from),
        lte(invoices.dueDate, period.to)
      )
    )
    .orderBy(invoices.dueDate);

  const rent = rentRows.map((r) => {
    const amount = Number(r.amount);
    const paid = Number(r.paid ?? 0);
    return { ...r, amount, paid, outstanding: Math.max(0, Math.round((amount - paid) * 100) / 100) };
  });
  const rentExpected = rent.reduce((s, r) => s + r.amount, 0);
  const rentReceived = rent.reduce((s, r) => s + Math.min(r.paid, r.amount), 0);

  const [coverage] = await db
    .select({
      lastBooked: sql<Date | null>`max(${bankTransactions.bookedAt})`,
      linesInMonth: sql<string>`count(*) filter (where ${bankTransactions.bookedAt} between ${from.toISOString()} and ${to.toISOString()})`,
    })
    .from(bankTransactions)
    .where(and(eq(bankTransactions.branchId, branchId), agencyEq(bankTransactions.agencyId)));
  const lastBooked = coverage?.lastBooked ? new Date(coverage.lastBooked) : null;

  // 2. Money in that couldn't be tied to a tenant.
  const [exceptionCount] = await db
    .select({ n: sql<string>`count(*)` })
    .from(paymentExceptions)
    .where(
      and(
        eq(paymentExceptions.branchId, branchId),
        eq(paymentExceptions.status, "open"),
        agencyEq(paymentExceptions.agencyId)
      )
    );

  // 3. Landlords still owed money.
  const balances = (await listLandlordBalances(branchId)).filter((b) => b.balance > 0.005);

  // 4. Money out this month: payouts and contractor jobs, and whether the bank shows them.
  const payouts = await db
    .select({
      id: landlordPayouts.id,
      amount: landlordPayouts.amount,
      paidAt: landlordPayouts.paidAt,
      firstName: landlords.firstName,
      lastName: landlords.lastName,
      bankTxnId: bankTransactions.id,
      bankBookedAt: bankTransactions.bookedAt,
      bankDescription: bankTransactions.description,
    })
    .from(landlordPayouts)
    .innerJoin(landlords, eq(landlordPayouts.landlordId, landlords.id))
    .leftJoin(bankTransactions, eq(bankTransactions.landlordPayoutId, landlordPayouts.id))
    .where(
      and(
        eq(landlordPayouts.branchId, branchId),
        agencyEq(landlordPayouts.agencyId),
        gte(landlordPayouts.paidAt, from),
        lte(landlordPayouts.paidAt, to)
      )
    )
    .orderBy(landlordPayouts.paidAt);

  const jobDate = sql`coalesce(${workOrders.scheduledFor}, ${workOrders.createdAt})`;
  const jobRows = await db
    .select({
      workOrder: workOrders,
      contractorName: contractors.name,
      summary: tickets.summary,
      bankTxnId: bankTransactions.id,
      bankBookedAt: bankTransactions.bookedAt,
    })
    .from(workOrders)
    .innerJoin(contractors, eq(workOrders.contractorId, contractors.id))
    .innerJoin(tickets, eq(workOrders.ticketId, tickets.id))
    .leftJoin(bankTransactions, eq(bankTransactions.workOrderId, workOrders.id))
    .where(
      and(
        eq(workOrders.branchId, branchId),
        eq(workOrders.status, "completed"),
        isNotNull(workOrders.contractorId),
        agencyEq(workOrders.agencyId),
        sql`${jobDate} between ${from.toISOString()} and ${to.toISOString()}`
      )
    )
    .orderBy(jobDate);
  const contractorPayments = jobRows
    .map((r) => {
      const cost = workOrderContractorCost(r.workOrder);
      const charge = Number(r.workOrder.clientCharge ?? 0) || cost;
      return {
        id: r.workOrder.id,
        ticketId: r.workOrder.ticketId,
        contractorName: r.contractorName,
        summary: r.summary,
        date: r.workOrder.scheduledFor ?? r.workOrder.createdAt,
        cost,
        charge,
        bankTxnId: r.bankTxnId,
        bankBookedAt: r.bankBookedAt,
      };
    })
    .filter((r) => r.cost > 0);

  const outgoingLines = await db
    .select()
    .from(bankTransactions)
    .where(
      and(
        eq(bankTransactions.branchId, branchId),
        agencyEq(bankTransactions.agencyId),
        sql`${bankTransactions.amount} < 0`,
        inArray(bankTransactions.matchStatus, ["unmatched", "pending", "ignored"]),
        gte(bankTransactions.bookedAt, from),
        lte(bankTransactions.bookedAt, to)
      )
    )
    .orderBy(bankTransactions.bookedAt);
  const unexpected = outgoingLines.filter((t) => t.matchStatus !== "ignored");
  const markedExpected = outgoingLines.filter((t) => t.matchStatus === "ignored");

  // Open payouts/jobs that an unexpected line could be linked to by hand.
  const linkable = (await listExpectedOutgoings(branchId)).map((c) => ({
    kind: c.kind,
    id: c.id,
    amount: c.amount,
    label: c.label,
    date: c.date.toISOString().slice(0, 10),
  }));

  // 5. Statements for this period.
  const statements = await db
    .select({ id: landlordStatements.id })
    .from(landlordStatements)
    .where(
      and(
        eq(landlordStatements.branchId, branchId),
        agencyEq(landlordStatements.agencyId),
        gte(landlordStatements.periodTo, period.from),
        lte(landlordStatements.periodTo, period.to)
      )
    )
    .orderBy(desc(landlordStatements.createdAt));

  const jobMargin = contractorPayments.reduce((s, j) => s + (j.charge - j.cost), 0);

  return {
    period,
    rent,
    rentExpected,
    rentReceived,
    lastBooked,
    linesInMonth: Number(coverage?.linesInMonth ?? 0),
    openExceptions: Number(exceptionCount?.n ?? 0),
    balances,
    payouts: payouts.map((p) => ({ ...p, amount: Number(p.amount) })),
    contractorPayments,
    jobMargin,
    unexpected: unexpected.map((t) => ({ ...t, amount: Number(t.amount) })),
    markedExpected: markedExpected.map((t) => ({ ...t, amount: Number(t.amount) })),
    linkable,
    statementCount: statements.length,
  };
}
