import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "../index";
import { agencyEq, currentAgencyId, ensureAgency } from "../agency-scope";
import {
  invoices,
  ledgerEntries,
  paymentAllocations,
  payments,
  properties,
  renters,
  tenancies,
} from "../schema";
import {
  createInvoices,
  getTenancyContext,
  insertLedgerEntry,
  listOpenTenancyInvoices,
  refreshInvoiceStatus,
} from "./finance";
import { displayPersonName } from "@/lib/person-name";
import { parseOpeningBalance, type OpeningBalance } from "@/lib/finance/tenant-credit";

/**
 * Tenant credit: money a tenant has paid that hasn't gone against any rent or fee yet.
 *
 * It is never stored as a figure. It is what is left on the tenancy's payments after
 * their allocations to invoices: an overpayment, rent paid ahead, or an opening credit
 * brought over from a previous agent. A refund is a payment with a negative amount
 * (method "refund"). The money sits in the client account, held for the tenant, and
 * only becomes the landlord's when it is used against rent that has fallen due.
 */

const r2 = (n: number) => Math.round(n * 100) / 100;

export const REFUND_METHOD = "refund";
export const OPENING_BALANCE_METHOD = "opening_balance";

interface CreditSource {
  paymentId: string;
  paidAt: Date;
  remaining: number;
}

/** Payments with money left on them, oldest first, after refunds have used up the oldest. */
async function creditSources(tenancyId: string): Promise<{ sources: CreditSource[]; credit: number }> {
  const allocated = db
    .select({
      paymentId: paymentAllocations.paymentId,
      total: sql<string>`sum(${paymentAllocations.amount})`.as("total"),
    })
    .from(paymentAllocations)
    .groupBy(paymentAllocations.paymentId)
    .as("allocated");

  const rows = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      paidAt: payments.paidAt,
      allocated: allocated.total,
    })
    .from(payments)
    .leftJoin(allocated, eq(allocated.paymentId, payments.id))
    .where(and(eq(payments.tenancyId, tenancyId), agencyEq(payments.agencyId)))
    .orderBy(asc(payments.paidAt), asc(payments.createdAt));

  let refunded = rows.reduce((s, r) => s + Math.max(0, -Number(r.amount)), 0);
  const sources: CreditSource[] = [];
  for (const r of rows) {
    let remaining = r2(Number(r.amount) - Number(r.allocated ?? 0));
    if (remaining <= 0.005) continue;
    const used = Math.min(refunded, remaining);
    refunded -= used;
    remaining = r2(remaining - used);
    if (remaining > 0.005) sources.push({ paymentId: r.id, paidAt: r.paidAt, remaining });
  }
  return { sources, credit: r2(sources.reduce((s, x) => s + x.remaining, 0)) };
}

export async function getTenancyCredit(tenancyId: string): Promise<number> {
  await ensureAgency();
  return (await creditSources(tenancyId)).credit;
}

/**
 * Use the tenant's credit against open rent and fees, oldest first. By default only
 * charges due on or before today, so rent paid ahead stays with the tenant until its
 * due date; staff can pass `dueBy: null` to use it against everything already raised.
 * The rent goes to the landlord's account on the day it is applied.
 */
export async function applyTenantCredit(
  tenancyId: string,
  opts: { dueBy?: string | null; now?: Date } = {}
): Promise<{ applied: number; invoices: number }> {
  await ensureAgency();
  const now = opts.now ?? new Date();
  const dueBy = opts.dueBy === undefined ? now.toISOString().slice(0, 10) : opts.dueBy;

  const { sources } = await creditSources(tenancyId);
  if (!sources.length) return { applied: 0, invoices: 0 };
  const open = (await listOpenTenancyInvoices(tenancyId)).filter((i) => !dueBy || i.dueDate <= dueBy);
  if (!open.length) return { applied: 0, invoices: 0 };

  const ctx = await getTenancyContext(tenancyId);
  if (!ctx) return { applied: 0, invoices: 0 };

  const appliedBySource = new Map<string, number>();
  let applied = 0;
  let touched = 0;

  for (const inv of open) {
    const [row] = await db
      .select({ total: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
      .from(paymentAllocations)
      .where(and(eq(paymentAllocations.invoiceId, inv.id), agencyEq(paymentAllocations.agencyId)));
    let owed = r2(Number(inv.amount) - Number(row?.total ?? 0));
    if (owed <= 0.005) continue;

    let usedOnInvoice = 0;
    for (const src of sources) {
      if (owed <= 0.005) break;
      if (src.remaining <= 0.005) continue;
      const take = r2(Math.min(src.remaining, owed));
      await db.insert(paymentAllocations).values({
        agencyId: currentAgencyId(),
        branchId: ctx.branchId,
        paymentId: src.paymentId,
        invoiceId: inv.id,
        amount: String(take),
        createdAt: now,
      });
      src.remaining = r2(src.remaining - take);
      owed = r2(owed - take);
      usedOnInvoice = r2(usedOnInvoice + take);
      appliedBySource.set(src.paymentId, r2((appliedBySource.get(src.paymentId) ?? 0) + take));
    }
    if (usedOnInvoice <= 0) continue;

    await insertLedgerEntry({
      branchId: ctx.branchId,
      tenancyId,
      propertyId: ctx.propertyId,
      landlordId: ctx.landlordId,
      entryType: "allocation",
      amount: 0,
      invoiceId: inv.id,
      memo: `Credit of £${usedOnInvoice.toFixed(2)} used against ${inv.type === "late_fee" ? "fee" : "rent"} due ${inv.dueDate}`,
      meta: { allocated: usedOnInvoice, from_credit: true },
      occurredAt: now,
    });
    await refreshInvoiceStatus(inv.id);
    applied = r2(applied + usedOnInvoice);
    touched += 1;
  }

  if (ctx.landlordId) {
    const { postRentReceivedToLandlord } = await import("./landlord-finance");
    for (const [paymentId, amount] of appliedBySource) {
      await postRentReceivedToLandlord({
        branchId: ctx.branchId,
        landlordId: ctx.landlordId,
        propertyId: ctx.propertyId,
        tenancyId,
        rentAmount: amount,
        paymentId,
        occurredAt: now,
      });
    }
  }

  return { applied, invoices: touched };
}

/** Money for a tenancy that isn't for any particular charge: paid ahead, or brought over. */
export async function addTenantCredit(data: {
  tenancyId: string;
  amount: number;
  paidAt: Date;
  method: string;
  externalRef?: string | null;
  memo: string;
  meta?: Record<string, unknown>;
}) {
  await ensureAgency();
  const ctx = await getTenancyContext(data.tenancyId);
  if (!ctx) return null;
  const [payment] = await db
    .insert(payments)
    .values({
      agencyId: currentAgencyId(),
      branchId: ctx.branchId,
      tenancyId: data.tenancyId,
      amount: String(r2(data.amount)),
      paidAt: data.paidAt,
      method: data.method,
      externalRef: data.externalRef ?? null,
      meta: data.meta ?? {},
    })
    .returning();
  await insertLedgerEntry({
    branchId: ctx.branchId,
    tenancyId: data.tenancyId,
    propertyId: ctx.propertyId,
    landlordId: ctx.landlordId,
    entryType: "payment",
    amount: -r2(data.amount),
    paymentId: payment.id,
    memo: data.memo,
    meta: { credit: r2(data.amount) },
    occurredAt: data.paidAt,
  });
  return payment;
}

/** Pay credit back to the tenant. The bank line for it is matched on Month end. */
export async function refundTenantCredit(data: {
  tenancyId: string;
  amount: number;
  paidAt: Date;
  reference?: string | null;
  note?: string | null;
}): Promise<{ error: string } | { paymentId: string; creditLeft: number }> {
  await ensureAgency();
  const amount = r2(data.amount);
  const credit = await getTenancyCredit(data.tenancyId);
  if (!(amount > 0)) return { error: "Enter an amount to refund" };
  if (amount > credit + 0.005) return { error: `Only £${credit.toFixed(2)} credit is held for this tenancy` };
  const ctx = await getTenancyContext(data.tenancyId);
  if (!ctx) return { error: "Tenancy not found" };

  const [payment] = await db
    .insert(payments)
    .values({
      agencyId: currentAgencyId(),
      branchId: ctx.branchId,
      tenancyId: data.tenancyId,
      amount: String(-amount),
      paidAt: data.paidAt,
      method: REFUND_METHOD,
      meta: { reference: data.reference ?? null, note: data.note ?? null },
    })
    .returning();
  await insertLedgerEntry({
    branchId: ctx.branchId,
    tenancyId: data.tenancyId,
    propertyId: ctx.propertyId,
    landlordId: ctx.landlordId,
    entryType: "refund",
    amount,
    paymentId: payment.id,
    memo: `Credit refunded to tenant${data.reference ? ` (ref ${data.reference})` : ""}`,
    meta: { note: data.note ?? null },
    occurredAt: data.paidAt,
  });
  return { paymentId: payment.id, creditLeft: r2(credit - amount) };
}

export interface TenantCreditRow {
  tenancyId: string;
  credit: number;
  landlordId: string | null;
  propertyAddress: string;
  renterName: string;
  status: string;
  endDate: string | null;
  rentAmount: number;
  rentFrequency: string;
  nextDue: string | null;
  lastPaidAt: Date | null;
}

/** Every tenancy holding credit, largest first. */
export async function listTenantCredits(branchId: string): Promise<TenantCreditRow[]> {
  await ensureAgency();
  const [paid, allocated] = await Promise.all([
    db
      .select({
        tenancyId: payments.tenancyId,
        total: sql<string>`sum(${payments.amount})`,
        lastPaidAt: sql<Date | null>`max(${payments.paidAt}) filter (where ${payments.amount} > 0)`,
      })
      .from(payments)
      .where(and(eq(payments.branchId, branchId), agencyEq(payments.agencyId)))
      .groupBy(payments.tenancyId),
    db
      .select({ tenancyId: payments.tenancyId, total: sql<string>`sum(${paymentAllocations.amount})` })
      .from(paymentAllocations)
      .innerJoin(payments, eq(paymentAllocations.paymentId, payments.id))
      .where(and(eq(payments.branchId, branchId), agencyEq(payments.agencyId)))
      .groupBy(payments.tenancyId),
  ]);
  const allocatedBy = new Map(allocated.map((a) => [a.tenancyId, Number(a.total)]));
  const credits = paid
    .filter((p) => p.tenancyId)
    .map((p) => ({
      tenancyId: p.tenancyId!,
      credit: r2(Number(p.total) - (allocatedBy.get(p.tenancyId) ?? 0)),
      lastPaidAt: p.lastPaidAt ? new Date(p.lastPaidAt) : null,
    }))
    .filter((c) => c.credit > 0.005);
  if (!credits.length) return [];

  const ids = credits.map((c) => c.tenancyId);
  const [info, nextDue] = await Promise.all([
    db
      .select({
        id: tenancies.id,
        status: tenancies.status,
        endDate: tenancies.endDate,
        rentAmount: tenancies.rentAmount,
        rentFrequency: tenancies.rentFrequency,
        address: properties.displayAddress,
        landlordId: properties.landlordId,
        firstName: renters.firstName,
        lastName: renters.lastName,
      })
      .from(tenancies)
      .innerJoin(properties, eq(tenancies.propertyId, properties.id))
      .innerJoin(renters, eq(tenancies.primaryRenterId, renters.id))
      .where(and(inArray(tenancies.id, ids), agencyEq(tenancies.agencyId))),
    db
      .select({ tenancyId: invoices.tenancyId, due: sql<string>`min(${invoices.dueDate})` })
      .from(invoices)
      .where(
        and(
          inArray(invoices.tenancyId, ids),
          agencyEq(invoices.agencyId),
          inArray(invoices.status, ["due", "partial"]),
          inArray(invoices.type, ["rent", "late_fee"])
        )
      )
      .groupBy(invoices.tenancyId),
  ]);
  const infoBy = new Map(info.map((i) => [i.id, i]));
  const dueBy = new Map(nextDue.map((n) => [n.tenancyId, n.due]));

  return credits
    .map((c) => {
      const t = infoBy.get(c.tenancyId);
      return {
        tenancyId: c.tenancyId,
        credit: c.credit,
        landlordId: t?.landlordId ?? null,
        propertyAddress: t?.address ?? "Unknown property",
        renterName: t ? displayPersonName(t.firstName, t.lastName) : "",
        status: t?.status ?? "unknown",
        endDate: t?.endDate ?? null,
        rentAmount: Number(t?.rentAmount ?? 0),
        rentFrequency: t?.rentFrequency ?? "monthly",
        nextDue: dueBy.get(c.tenancyId) ?? null,
        lastPaidAt: c.lastPaidAt,
      };
    })
    .sort((a, b) => b.credit - a.credit);
}

/** Credit held for tenants of each landlord's properties, for the note on their statement. */
export async function tenantCreditByLandlord(branchId: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const row of await listTenantCredits(branchId)) {
    if (!row.landlordId) continue;
    out.set(row.landlordId, r2((out.get(row.landlordId) ?? 0) + row.credit));
  }
  return out;
}

/** Daily: use credit against anything that has fallen due. */
export async function applyDueCreditsForBranch(branchId: string, now = new Date()) {
  const rows = await listTenantCredits(branchId);
  let applied = 0;
  let tenancyCount = 0;
  for (const row of rows) {
    if (!row.nextDue || row.nextDue > now.toISOString().slice(0, 10)) continue;
    const result = await applyTenantCredit(row.tenancyId, { now });
    if (result.applied > 0) {
      applied = r2(applied + result.applied);
      tenancyCount += 1;
    }
  }
  return { tenancies: tenancyCount, applied };
}

/** Credit held for tenants at the end of a day, for the client account check. */
export async function totalTenantCreditAt(branchId: string, end: Date): Promise<number> {
  await ensureAgency();
  const [[paid], [allocated]] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(
        and(
          eq(payments.branchId, branchId),
          agencyEq(payments.agencyId),
          sql`${payments.tenancyId} is not null`,
          lte(payments.paidAt, end)
        )
      ),
    db
      .select({ total: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)` })
      .from(paymentAllocations)
      .innerJoin(payments, eq(paymentAllocations.paymentId, payments.id))
      .where(
        and(
          eq(payments.branchId, branchId),
          agencyEq(payments.agencyId),
          sql`${payments.tenancyId} is not null`,
          lte(payments.paidAt, end),
          lte(paymentAllocations.createdAt, end)
        )
      ),
  ]);
  return Math.max(0, r2(Number(paid?.total ?? 0) - Number(allocated?.total ?? 0)));
}

/* ---------------------------------------------------------------- opening balances */

async function readOpening(tenancyId: string) {
  const [row] = await db
    .select({ metadata: tenancies.metadata, branchId: tenancies.branchId })
    .from(tenancies)
    .where(and(eq(tenancies.id, tenancyId), agencyEq(tenancies.agencyId)))
    .limit(1);
  if (!row) return null;
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  return { metadata, opening: parseOpeningBalance(metadata.opening_balance), branchId: row.branchId };
}

/** Whether an opening balance can still be changed: nothing has been paid against it. */
async function openingIsUntouched(tenancyId: string, opening: OpeningBalance): Promise<boolean> {
  if (opening.kind === "arrears" && opening.invoiceId) {
    const [row] = await db
      .select({ n: sql<string>`count(*)` })
      .from(paymentAllocations)
      .where(and(eq(paymentAllocations.invoiceId, opening.invoiceId), agencyEq(paymentAllocations.agencyId)));
    return Number(row?.n ?? 0) === 0;
  }
  if (opening.kind === "credit" && opening.paymentId) {
    const [row] = await db
      .select({ n: sql<string>`count(*)` })
      .from(paymentAllocations)
      .where(and(eq(paymentAllocations.paymentId, opening.paymentId), agencyEq(paymentAllocations.agencyId)));
    if (Number(row?.n ?? 0) > 0) return false;
    // A refund may have used it.
    return (await getTenancyCredit(tenancyId)) + 0.005 >= opening.amount;
  }
  return true;
}

/**
 * Set, change or clear (input null) the balance a tenancy had when it moved over from
 * the previous agent or system. Arrears become an "opening arrears" rent charge dated
 * on the as-of day; credit becomes an opening credit used on the next due dates.
 */
export async function setOpeningBalance(
  tenancyId: string,
  input: { kind: "arrears" | "credit"; amount: number; asOf: string; note?: string | null } | null
): Promise<{ error: string } | { opening: OpeningBalance | null }> {
  await ensureAgency();
  const current = await readOpening(tenancyId);
  if (!current) return { error: "Tenancy not found" };

  if (current.opening) {
    if (!(await openingIsUntouched(tenancyId, current.opening))) {
      return {
        error:
          "Money has already gone against the opening balance, so it can't be changed. Add a charge or credit instead.",
      };
    }
    const o = current.opening;
    if (o.invoiceId) {
      await db
        .delete(ledgerEntries)
        .where(and(eq(ledgerEntries.invoiceId, o.invoiceId), agencyEq(ledgerEntries.agencyId)));
      await db.delete(invoices).where(and(eq(invoices.id, o.invoiceId), agencyEq(invoices.agencyId)));
    }
    if (o.paymentId) {
      await db
        .delete(ledgerEntries)
        .where(and(eq(ledgerEntries.paymentId, o.paymentId), agencyEq(ledgerEntries.agencyId)));
      await db.delete(payments).where(and(eq(payments.id, o.paymentId), agencyEq(payments.agencyId)));
    }
  }

  let opening: OpeningBalance | null = null;
  if (input && input.amount > 0.005) {
    const amount = r2(input.amount);
    const note = input.note?.trim() || null;
    if (input.kind === "arrears") {
      const [inv] = await createInvoices([
        {
          branchId: current.branchId,
          tenancyId,
          type: "rent",
          dueDate: input.asOf,
          amount,
          meta: { opening_balance: true, label: "Opening arrears", note },
        },
      ]);
      opening = { kind: "arrears", amount, asOf: input.asOf, note, invoiceId: inv?.id ?? null, paymentId: null, setAt: new Date().toISOString() };
    } else {
      const payment = await addTenantCredit({
        tenancyId,
        amount,
        paidAt: new Date(`${input.asOf}T12:00:00.000Z`),
        method: OPENING_BALANCE_METHOD,
        memo: `Opening credit brought over (as of ${input.asOf})`,
        meta: { opening_balance: true, note },
      });
      opening = { kind: "credit", amount, asOf: input.asOf, note, invoiceId: null, paymentId: payment?.id ?? null, setAt: new Date().toISOString() };
    }
  }

  const metadata = { ...current.metadata };
  if (opening) metadata.opening_balance = opening;
  else delete metadata.opening_balance;
  await db
    .update(tenancies)
    .set({ metadata })
    .where(and(eq(tenancies.id, tenancyId), agencyEq(tenancies.agencyId)));

  // Opening arrears may be covered by credit already held, and opening credit may cover rent already due.
  if (opening) await applyTenantCredit(tenancyId);
  return { opening };
}

export interface OpeningBalanceCandidate {
  tenancyId: string;
  propertyAddress: string;
  renterName: string;
  rentAmount: number;
  startDate: string;
}

/** Active tenancies with no opening balance recorded yet, for the bulk entry table. */
export async function listTenanciesWithoutOpeningBalance(branchId: string): Promise<OpeningBalanceCandidate[]> {
  await ensureAgency();
  const rows = await db
    .select({
      id: tenancies.id,
      rentAmount: tenancies.rentAmount,
      startDate: tenancies.startDate,
      address: properties.displayAddress,
      firstName: renters.firstName,
      lastName: renters.lastName,
    })
    .from(tenancies)
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .innerJoin(renters, eq(tenancies.primaryRenterId, renters.id))
    .where(
      and(
        eq(tenancies.branchId, branchId),
        agencyEq(tenancies.agencyId),
        eq(tenancies.status, "active"),
        sql`${tenancies.metadata}->'opening_balance' is null`
      )
    )
    .orderBy(asc(properties.displayAddress));
  return rows.map((r) => ({
    tenancyId: r.id,
    propertyAddress: r.address,
    renterName: displayPersonName(r.firstName, r.lastName),
    rentAmount: Number(r.rentAmount),
    startDate: r.startDate,
  }));
}

export async function getOpeningBalance(tenancyId: string): Promise<OpeningBalance | null> {
  await ensureAgency();
  return (await readOpening(tenancyId))?.opening ?? null;
}
