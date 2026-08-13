import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../index";
import {
  bankConnections,
  bankTransactions,
  invoices,
  paymentAllocations,
  paymentExceptions,
  properties,
  renters,
  tenancies,
} from "../schema";
import type { MatchCandidate } from "@/lib/bank-feed/match";
import { getPaymentRefFromMetadata } from "@/lib/payment-ref";

export async function updateBankConnection(
  id: string,
  patch: Partial<{
    status: string;
    accountName: string | null;
    lastSyncedAt: Date | null;
    meta: Record<string, unknown>;
  }>
) {
  const values: Record<string, unknown> = { updatedAt: new Date(), ...patch };
  const [row] = await db
    .update(bankConnections)
    .set(values)
    .where(eq(bankConnections.id, id))
    .returning();
  return row ?? null;
}

export async function getBankConnectionById(id: string) {
  const [row] = await db.select().from(bankConnections).where(eq(bankConnections.id, id)).limit(1);
  return row ?? null;
}

export async function listBankConnections(branchId: string) {
  return db
    .select()
    .from(bankConnections)
    .where(eq(bankConnections.branchId, branchId))
    .orderBy(desc(bankConnections.createdAt));
}

export async function insertBankTransaction(data: {
  branchId: string;
  connectionId: string;
  providerTxnId: string;
  bookedAt: Date;
  amount: number;
  currency?: string;
  description?: string | null;
  counterparty?: string | null;
  raw?: Record<string, unknown>;
}) {
  const existing = await db
    .select()
    .from(bankTransactions)
    .where(
      and(
        eq(bankTransactions.branchId, data.branchId),
        eq(bankTransactions.providerTxnId, data.providerTxnId)
      )
    )
    .limit(1);
  if (existing[0]) return { row: existing[0], created: false };

  const [row] = await db
    .insert(bankTransactions)
    .values({
      branchId: data.branchId,
      connectionId: data.connectionId,
      providerTxnId: data.providerTxnId,
      bookedAt: data.bookedAt,
      amount: String(data.amount),
      currency: data.currency ?? "GBP",
      description: data.description ?? null,
      counterparty: data.counterparty ?? null,
      matchStatus: "pending",
      raw: data.raw ?? {},
    })
    .returning();
  return { row, created: true };
}

export async function getBankTransactionById(id: string) {
  const [row] = await db
    .select()
    .from(bankTransactions)
    .where(eq(bankTransactions.id, id))
    .limit(1);
  return row ?? null;
}

export async function listPendingBankTransactions(branchId: string) {
  return db
    .select()
    .from(bankTransactions)
    .where(
      and(eq(bankTransactions.branchId, branchId), eq(bankTransactions.matchStatus, "pending"))
    )
    .orderBy(desc(bankTransactions.bookedAt));
}

export async function updateBankTransaction(
  id: string,
  patch: Partial<{
    matchStatus: string;
    paymentId: string | null;
    invoiceId: string | null;
    tenancyId: string | null;
    exceptionId: string | null;
  }>
) {
  const [row] = await db
    .update(bankTransactions)
    .set(patch)
    .where(eq(bankTransactions.id, id))
    .returning();
  return row ?? null;
}

export async function listOpenInvoiceMatchCandidates(
  branchId: string
): Promise<MatchCandidate[]> {
  const rows = await db
    .select({
      invoiceId: invoices.id,
      tenancyId: invoices.tenancyId,
      amount: invoices.amount,
      dueDate: invoices.dueDate,
      renterFirstName: renters.firstName,
      renterLastName: renters.lastName,
      propertyAddress: properties.displayAddress,
      agentRef: properties.agentRef,
      tenancyMetadata: tenancies.metadata,
    })
    .from(invoices)
    .innerJoin(tenancies, eq(invoices.tenancyId, tenancies.id))
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .innerJoin(renters, eq(tenancies.primaryRenterId, renters.id))
    .where(
      and(
        eq(invoices.branchId, branchId),
        inArray(invoices.status, ["due", "partial"]),
        inArray(invoices.type, ["rent", "late_fee"])
      )
    );

  const invoiceIds = rows.map((r) => r.invoiceId);
  const allocated = new Map<string, number>();
  if (invoiceIds.length) {
    const sums = await db
      .select({
        invoiceId: paymentAllocations.invoiceId,
        total: sql<string>`coalesce(sum(${paymentAllocations.amount}), 0)`,
      })
      .from(paymentAllocations)
      .where(inArray(paymentAllocations.invoiceId, invoiceIds))
      .groupBy(paymentAllocations.invoiceId);
    for (const s of sums) allocated.set(s.invoiceId, Number(s.total));
  }

  return rows
    .filter((r): r is typeof r & { tenancyId: string } => Boolean(r.tenancyId))
    .map((r) => {
      const remaining = Math.max(0, Number(r.amount) - (allocated.get(r.invoiceId) ?? 0));
      return {
        invoiceId: r.invoiceId,
        tenancyId: r.tenancyId,
        amountDue: Number(r.amount),
        dueDate: r.dueDate,
        renterName: `${r.renterFirstName} ${r.renterLastName}`.trim(),
        propertyAddress: r.propertyAddress,
        agentRef: r.agentRef,
        paymentRef: getPaymentRefFromMetadata(r.tenancyMetadata),
        remaining,
      };
    })
    .filter((c) => c.remaining > 0.001);
}

export async function createUnmatchedException(data: {
  branchId: string;
  bankTransactionId: string;
  amount: number;
  note: string;
  suggestedInvoiceId?: string | null;
  suggestedTenancyId?: string | null;
}) {
  const [row] = await db
    .insert(paymentExceptions)
    .values({
      branchId: data.branchId,
      tenancyId: data.suggestedTenancyId ?? null,
      invoiceId: data.suggestedInvoiceId ?? null,
      kind: "unmatched",
      amount: String(data.amount),
      note: data.note,
      meta: {
        bankTransactionId: data.bankTransactionId,
        suggestedInvoiceId: data.suggestedInvoiceId ?? null,
      },
    })
    .returning();
  return row;
}

export async function getPaymentExceptionById(id: string) {
  const [row] = await db
    .select()
    .from(paymentExceptions)
    .where(eq(paymentExceptions.id, id))
    .limit(1);
  return row ?? null;
}

export async function getBankFeedSummary(branchId: string) {
  const [counts] = await db
    .select({
      pending: sql<number>`count(*) filter (where ${bankTransactions.matchStatus} = 'pending')::int`,
      matched: sql<number>`count(*) filter (where ${bankTransactions.matchStatus} = 'matched')::int`,
      exception: sql<number>`count(*) filter (where ${bankTransactions.matchStatus} = 'exception')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(bankTransactions)
    .where(eq(bankTransactions.branchId, branchId));

  return {
    pending: counts?.pending ?? 0,
    matched: counts?.matched ?? 0,
    exception: counts?.exception ?? 0,
    total: counts?.total ?? 0,
  };
}
