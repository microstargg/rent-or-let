import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db } from "../index";
import { agencyEq, ensureAgency } from "../agency-scope";
import {
  bankTransactions,
  invoices,
  landlordLedgerEntries,
  ledgerEntries,
  paymentAllocations,
  paymentExceptions,
  payments,
  properties,
  renters,
  tenancies,
} from "../schema";
import { ensureBankFeed, updateBankTransaction } from "./bank-feed";
import { createPaymentException, recordPaymentAndAllocate, refreshInvoiceStatus, resolvePaymentException } from "./finance";
import { matchBankTransaction, type MatchCandidate } from "@/lib/bank-feed/match";
import { getPaymentRefFromMetadata } from "@/lib/payment-ref";

/**
 * The weekly bank check. Staff tick rent off by hand each day ("Yes, it's in"); when
 * the bank statement is uploaded, each money-in line is first paired with one of those
 * ticks, so the same rent isn't recorded twice. What's left shows the gaps:
 * ticks the bank doesn't show, bank money nobody ticked, and amounts that differ.
 */

/** Days either side of a tick that the bank line can be booked on. */
const PAIR_WINDOW_DAYS = 7;
const DAY = 86400000;

export const BANK_MISMATCH = "bank_mismatch";

/** A payment staff recorded by hand: bank transfer with no bank line behind it. */
const handTicked = and(
  eq(payments.method, "bank_transfer"),
  isNull(payments.externalRef),
  sql`${payments.amount} > 0`
);

const notLinkedToBank = sql`not exists (select 1 from ${bankTransactions} bt where bt.payment_id = ${payments.id})`;

async function listUnconfirmedTicks(branchId: string, from: Date, to: Date) {
  return db
    .select({
      paymentId: payments.id,
      invoiceId: payments.invoiceId,
      tenancyId: payments.tenancyId,
      amount: payments.amount,
      paidAt: payments.paidAt,
      meta: payments.meta,
      renterFirstName: renters.firstName,
      renterLastName: renters.lastName,
      propertyAddress: properties.displayAddress,
      agentRef: properties.agentRef,
      tenancyMetadata: tenancies.metadata,
    })
    .from(payments)
    .innerJoin(tenancies, eq(payments.tenancyId, tenancies.id))
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .innerJoin(renters, eq(tenancies.primaryRenterId, renters.id))
    .where(
      and(
        eq(payments.branchId, branchId),
        agencyEq(payments.agencyId),
        handTicked,
        gte(payments.paidAt, from),
        lte(payments.paidAt, to),
        notLinkedToBank,
        sql`coalesce(${payments.meta}->>'bank_mismatch', '') = ''`
      )
    )
    .orderBy(asc(payments.paidAt));
}

type Tick = Awaited<ReturnType<typeof listUnconfirmedTicks>>[number];

function tickCandidate(t: Tick): MatchCandidate {
  return {
    invoiceId: t.paymentId,
    tenancyId: t.tenancyId!,
    amountDue: Number(t.amount),
    remaining: Number(t.amount),
    dueDate: t.paidAt.toISOString().slice(0, 10),
    renterName: `${t.renterFirstName} ${t.renterLastName}`.trim(),
    propertyAddress: t.propertyAddress,
    agentRef: t.agentRef,
    paymentRef: getPaymentRefFromMetadata(t.tenancyMetadata),
  };
}

/**
 * Pair pending money-in bank lines with rent staff already ticked as received.
 * Same tenant and amount: the line confirms the tick. Same tenant, different amount:
 * flagged for staff ("bank_mismatch") rather than guessed at.
 */
export async function pairBankLinesWithTicks(
  branchId: string,
  pending: { id: string; amount: string; description: string | null; counterparty: string | null; bookedAt: Date }[]
): Promise<{ paired: number; mismatched: number; handled: Set<string> }> {
  await ensureAgency();
  const handled = new Set<string>();
  const credits = pending.filter((p) => Number(p.amount) > 0);
  if (!credits.length) return { paired: 0, mismatched: 0, handled };

  const times = credits.map((c) => c.bookedAt.getTime());
  const ticks = await listUnconfirmedTicks(
    branchId,
    new Date(Math.min(...times) - PAIR_WINDOW_DAYS * DAY),
    new Date(Math.max(...times) + PAIR_WINDOW_DAYS * DAY)
  );
  let pool = ticks.filter((t) => t.tenancyId);
  if (!pool.length) return { paired: 0, mismatched: 0, handled };

  let paired = 0;
  let mismatched = 0;
  for (const line of credits) {
    const amount = Number(line.amount);
    const near = pool.filter((t) => Math.abs(t.paidAt.getTime() - line.bookedAt.getTime()) <= PAIR_WINDOW_DAYS * DAY);
    if (!near.length) continue;
    const result = matchBankTransaction(
      { amount, description: line.description, counterparty: line.counterparty, bookedAt: line.bookedAt },
      near.map(tickCandidate)
    );
    if (result.confidence !== "high" || !result.tenancyId) continue;

    const forTenancy = near
      .filter((t) => t.tenancyId === result.tenancyId)
      .sort(
        (a, b) =>
          Math.abs(a.paidAt.getTime() - line.bookedAt.getTime()) - Math.abs(b.paidAt.getTime() - line.bookedAt.getTime())
      );
    const exact = forTenancy.find((t) => Math.abs(Number(t.amount) - amount) < 0.011);

    if (exact) {
      await updateBankTransaction(line.id, {
        matchStatus: "matched",
        paymentId: exact.paymentId,
        invoiceId: exact.invoiceId,
        tenancyId: exact.tenancyId,
      });
      pool = pool.filter((t) => t.paymentId !== exact.paymentId);
      handled.add(line.id);
      paired += 1;
      continue;
    }

    // The tenant paid, but not what was ticked. If the line exactly clears rent that is
    // still open for them, it's a separate payment: let normal matching take it.
    const open = await db
      .select({ amount: invoices.amount, id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenancyId, result.tenancyId),
          agencyEq(invoices.agencyId),
          inArray(invoices.status, ["due", "partial"]),
          inArray(invoices.type, ["rent", "late_fee"])
        )
      );
    if (open.some((o) => Math.abs(Number(o.amount) - amount) < 0.011)) continue;

    const tick = forTenancy[0]!;
    const ticked = Number(tick.amount);
    const exception = await createPaymentException({
      branchId,
      tenancyId: tick.tenancyId,
      paymentId: tick.paymentId,
      invoiceId: tick.invoiceId,
      kind: BANK_MISMATCH,
      amount,
      note: `Marked as received £${ticked.toFixed(2)} on ${tick.paidAt.toISOString().slice(0, 10)}, the bank shows £${amount.toFixed(2)}`,
      meta: { bankTransactionId: line.id, tickedPaymentId: tick.paymentId, ticked, bank: amount },
    });
    await updateBankTransaction(line.id, {
      matchStatus: "exception",
      exceptionId: exception.id,
      invoiceId: tick.invoiceId,
      tenancyId: tick.tenancyId,
    });
    await db
      .update(payments)
      .set({ meta: sql`coalesce(${payments.meta}, '{}'::jsonb) || ${JSON.stringify({ bank_mismatch: line.id })}::jsonb` })
      .where(and(eq(payments.id, tick.paymentId), agencyEq(payments.agencyId)));
    pool = pool.filter((t) => t.paymentId !== tick.paymentId);
    handled.add(line.id);
    mismatched += 1;
  }
  return { paired, mismatched, handled };
}

/** The span of days the uploaded bank statements cover, newest last. */
export async function getBankCoverage(branchId: string) {
  await ensureBankFeed();
  const [row] = await db
    .select({
      first: sql<Date | null>`min(${bankTransactions.bookedAt})`,
      last: sql<Date | null>`max(${bankTransactions.bookedAt})`,
    })
    .from(bankTransactions)
    .where(and(eq(bankTransactions.branchId, branchId), agencyEq(bankTransactions.agencyId)));
  return {
    first: row?.first ? new Date(row.first) : null,
    last: row?.last ? new Date(row.last) : null,
  };
}

/**
 * Rent ticked as received that the uploaded statements should show but don't.
 * Only ticks inside the dates the statements cover (and the last five weeks), since a
 * tick after the last upload simply hasn't been checked yet.
 */
export async function listTicksNotInBank(branchId: string) {
  await Promise.all([ensureAgency(), ensureBankFeed()]);
  const coverage = await getBankCoverage(branchId);
  if (!coverage.first || !coverage.last) return { coverage, rows: [] };
  const fiveWeeks = new Date(coverage.last.getTime() - 35 * DAY);
  const from = coverage.first > fiveWeeks ? coverage.first : fiveWeeks;
  // A rent ticked on the statement's last day may only clear the next day.
  const to = new Date(coverage.last.getTime() - DAY);
  const ticks = await listUnconfirmedTicks(branchId, new Date(from.getTime() - DAY), to);
  const rows = ticks
    .filter((t) => (t.meta as Record<string, unknown> | null)?.bank_check !== "dismissed")
    .map((t) => ({
      paymentId: t.paymentId,
      tenancyId: t.tenancyId,
      invoiceId: t.invoiceId,
      amount: Number(t.amount),
      paidAt: t.paidAt,
      renterName: `${t.renterFirstName} ${t.renterLastName}`.trim(),
      propertyAddress: t.propertyAddress,
    }));
  return { coverage, rows };
}

/** Staff say a tick is fine without a bank line (e.g. paid in cash). */
export async function dismissTickCheck(branchId: string, paymentId: string) {
  await ensureAgency();
  const [row] = await db
    .update(payments)
    .set({ meta: sql`coalesce(${payments.meta}, '{}'::jsonb) || '{"bank_check":"dismissed"}'::jsonb` })
    .where(and(eq(payments.id, paymentId), eq(payments.branchId, branchId), agencyEq(payments.agencyId), handTicked))
    .returning({ id: payments.id });
  return row ?? null;
}

/**
 * Take back a rent payment that was ticked by mistake: its allocations, rent-account
 * lines and the landlord's rent and fee lines all go, and the rent shows as owing again.
 * Refused once the money is on a landlord statement, or a bank line backs it.
 */
export async function undoHandPayment(branchId: string, paymentId: string): Promise<{ ok: true } | { error: string }> {
  await Promise.all([ensureAgency(), ensureBankFeed()]);
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.branchId, branchId), agencyEq(payments.agencyId)))
    .limit(1);
  if (!payment) return { error: "Payment not found" };
  if (payment.method !== "bank_transfer" || payment.externalRef || Number(payment.amount) <= 0) {
    return { error: "Only rent marked as received by hand can be undone here" };
  }
  const [linked] = await db
    .select({ id: bankTransactions.id })
    .from(bankTransactions)
    .where(and(eq(bankTransactions.paymentId, paymentId), eq(bankTransactions.matchStatus, "matched")))
    .limit(1);
  if (linked) return { error: "A bank line already backs this payment" };
  const [onStatement] = await db
    .select({ id: landlordLedgerEntries.id })
    .from(landlordLedgerEntries)
    .where(and(eq(landlordLedgerEntries.paymentId, paymentId), isNotNull(landlordLedgerEntries.statementId)))
    .limit(1);
  if (onStatement) return { error: "This payment is already on a landlord statement, so it can't be undone" };

  const allocs = await db
    .select({ invoiceId: paymentAllocations.invoiceId })
    .from(paymentAllocations)
    .where(eq(paymentAllocations.paymentId, paymentId));
  const invoiceIds = [...new Set(allocs.map((a) => a.invoiceId))];

  await db.delete(landlordLedgerEntries).where(eq(landlordLedgerEntries.paymentId, paymentId));
  await db.delete(ledgerEntries).where(eq(ledgerEntries.paymentId, paymentId));
  await db.delete(paymentAllocations).where(eq(paymentAllocations.paymentId, paymentId));
  await db
    .update(paymentExceptions)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(and(eq(paymentExceptions.paymentId, paymentId), eq(paymentExceptions.status, "open")));
  await db.delete(payments).where(eq(payments.id, paymentId));
  for (const id of invoiceIds) await refreshInvoiceStatus(id);
  return { ok: true };
}

/** Bank lines sitting in "Payments to check" that a tick could be paired with by hand. */
export async function listUnmatchedBankCredits(branchId: string) {
  await ensureBankFeed();
  return db
    .select({
      id: bankTransactions.id,
      amount: bankTransactions.amount,
      bookedAt: bankTransactions.bookedAt,
      description: bankTransactions.description,
      exceptionId: bankTransactions.exceptionId,
    })
    .from(bankTransactions)
    .innerJoin(paymentExceptions, eq(paymentExceptions.id, bankTransactions.exceptionId))
    .where(
      and(
        eq(bankTransactions.branchId, branchId),
        agencyEq(bankTransactions.agencyId),
        eq(bankTransactions.matchStatus, "exception"),
        eq(paymentExceptions.kind, "unmatched"),
        eq(paymentExceptions.status, "open"),
        sql`${bankTransactions.amount} > 0`
      )
    )
    .orderBy(desc(bankTransactions.bookedAt))
    .limit(200);
}

/** Staff pair a bank line with a tick by hand. The bank line must be the same amount. */
export async function linkBankLineToTick(
  branchId: string,
  bankTransactionId: string,
  paymentId: string
): Promise<{ ok: true } | { error: string }> {
  await Promise.all([ensureAgency(), ensureBankFeed()]);
  const [txn] = await db
    .select()
    .from(bankTransactions)
    .where(and(eq(bankTransactions.id, bankTransactionId), eq(bankTransactions.branchId, branchId), agencyEq(bankTransactions.agencyId)))
    .limit(1);
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.branchId, branchId), agencyEq(payments.agencyId)))
    .limit(1);
  if (!txn || !payment) return { error: "Not found" };
  if (txn.paymentId) return { error: "That bank line is already matched" };
  if (Math.abs(Number(txn.amount) - Number(payment.amount)) >= 0.011) {
    return { error: "The amounts differ. Undo the tick and match the bank line to the rent instead." };
  }
  await updateBankTransaction(txn.id, {
    matchStatus: "matched",
    paymentId: payment.id,
    invoiceId: payment.invoiceId,
    tenancyId: payment.tenancyId,
  });
  if (txn.exceptionId) await resolvePaymentException(txn.exceptionId);
  return { ok: true };
}

/**
 * Settle a "bank_mismatch": either the tick was right (keep it and link the bank line),
 * or the bank is right (undo the tick and record what the bank shows).
 */
export async function resolveBankMismatch(
  branchId: string,
  exceptionId: string,
  choice: "keep_tick" | "use_bank"
): Promise<{ ok: true } | { error: string }> {
  await Promise.all([ensureAgency(), ensureBankFeed()]);
  const [exception] = await db
    .select()
    .from(paymentExceptions)
    .where(and(eq(paymentExceptions.id, exceptionId), eq(paymentExceptions.branchId, branchId), agencyEq(paymentExceptions.agencyId)))
    .limit(1);
  if (!exception || exception.kind !== BANK_MISMATCH || exception.status !== "open") {
    return { error: "Not found" };
  }
  const meta = (exception.meta ?? {}) as { bankTransactionId?: string; tickedPaymentId?: string };
  if (!meta.bankTransactionId || !meta.tickedPaymentId) return { error: "Missing details" };
  const [txn] = await db.select().from(bankTransactions).where(eq(bankTransactions.id, meta.bankTransactionId)).limit(1);
  const [tick] = await db.select().from(payments).where(eq(payments.id, meta.tickedPaymentId)).limit(1);
  if (!txn) return { error: "Bank line not found" };

  if (choice === "keep_tick") {
    if (!tick) return { error: "The ticked payment no longer exists" };
    await updateBankTransaction(txn.id, {
      matchStatus: "matched",
      paymentId: tick.id,
      invoiceId: tick.invoiceId,
      tenancyId: tick.tenancyId,
    });
    await resolvePaymentException(exception.id);
    return { ok: true };
  }

  const invoiceId = tick?.invoiceId ?? exception.invoiceId;
  const tenancyId = tick?.tenancyId ?? exception.tenancyId;
  if (!invoiceId || !tenancyId) return { error: "No rent to record it against" };
  if (tick) {
    const undone = await undoHandPayment(branchId, tick.id);
    if ("error" in undone) return undone;
  }
  const externalRef = /^(csv|pdf|tl|eb)_/.test(txn.providerTxnId) ? txn.providerTxnId : `csv_${txn.providerTxnId}`;
  const posted = await recordPaymentAndAllocate({
    branchId,
    tenancyId,
    invoiceId,
    amount: Number(txn.amount),
    method: "bank_transfer",
    externalRef,
    paidAt: txn.bookedAt,
    spillToTenancy: true,
  });
  if (!posted?.payment) return { error: "Couldn't record the bank amount" };
  await updateBankTransaction(txn.id, { matchStatus: "matched", paymentId: posted.payment.id, invoiceId, tenancyId });
  await resolvePaymentException(exception.id);
  return { ok: true };
}
