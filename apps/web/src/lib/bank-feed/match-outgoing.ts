import { and, eq, isNotNull, isNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencyEq } from "@/lib/db/agency-scope";
import { ensureBankFeed } from "@/lib/db/queries/bank-feed";
import {
  bankTransactions,
  contractors,
  landlordPayouts,
  landlords,
  tickets,
  workOrders,
} from "@/lib/db/schema";
import {
  listUnmatchedOutgoingTransactions,
  updateBankTransaction,
} from "@/lib/db/queries/bank-feed";
import { workOrderContractorCost } from "@/lib/operations/maintenance/work-order-invoice";

const DAY = 86_400_000;

export interface OutgoingCandidate {
  kind: "payout" | "contractor";
  id: string;
  amount: number;
  date: Date;
  /** Bank line must fall within [date - before, date + after]. */
  before: number;
  after: number;
  names: string[];
  label: string;
}

/** Landlord payouts and completed contractor jobs that no bank line has been tied to yet. */
export async function listExpectedOutgoings(branchId: string): Promise<OutgoingCandidate[]> {
  await ensureBankFeed();
  const payouts = await db
    .select({
      payout: landlordPayouts,
      firstName: landlords.firstName,
      lastName: landlords.lastName,
    })
    .from(landlordPayouts)
    .innerJoin(landlords, eq(landlordPayouts.landlordId, landlords.id))
    .leftJoin(bankTransactions, eq(bankTransactions.landlordPayoutId, landlordPayouts.id))
    .where(
      and(
        eq(landlordPayouts.branchId, branchId),
        agencyEq(landlordPayouts.agencyId),
        isNull(bankTransactions.id)
      )
    );

  const jobs = await db
    .select({ workOrder: workOrders, contractorName: contractors.name, summary: tickets.summary })
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
        isNull(bankTransactions.id)
      )
    );

  return [
    ...payouts.map(({ payout, firstName, lastName }) => ({
      kind: "payout" as const,
      id: payout.id,
      amount: Number(payout.amount),
      date: payout.paidAt,
      before: 10 * DAY,
      after: 10 * DAY,
      names: [firstName, lastName],
      label: `Payout to ${`${firstName} ${lastName}`.trim()}`,
    })),
    ...jobs
      .map(({ workOrder, contractorName, summary }) => ({
        kind: "contractor" as const,
        id: workOrder.id,
        amount: workOrderContractorCost(workOrder),
        date: workOrder.scheduledFor ?? workOrder.createdAt,
        // Contractors are often paid weeks after the job, on their invoice terms.
        before: 7 * DAY,
        after: 90 * DAY,
        names: [contractorName ?? ""],
        label: `${contractorName ?? "Contractor"} — ${summary}`,
      }))
      .filter((c) => c.amount > 0),
  ];
}

function nameTokens(names: string[]): string[] {
  return names
    .flatMap((n) => n.toLowerCase().split(/[^a-z0-9]+/))
    .filter((t) => t.length >= 3);
}

/** Pick the one expected outgoing this bank line paid, or null if none or more than one fit. */
export function pickOutgoingCandidate(
  txn: { amount: number; bookedAt: Date; description: string | null; counterparty: string | null },
  candidates: OutgoingCandidate[]
): OutgoingCandidate | null {
  const paid = Math.abs(txn.amount);
  const text = `${txn.description ?? ""} ${txn.counterparty ?? ""}`.toLowerCase();
  const fits = candidates.filter((c) => {
    if (Math.abs(c.amount - paid) > 0.005) return false;
    const t = txn.bookedAt.getTime();
    return t >= c.date.getTime() - c.before && t <= c.date.getTime() + c.after;
  });
  if (fits.length === 1) return fits[0]!;
  const named = fits.filter((c) => nameTokens(c.names).some((tok) => text.includes(tok)));
  if (named.length === 1) return named[0]!;
  if (named.length > 1) {
    // Same payee and amount twice (e.g. two monthly payouts): take the closest date.
    return [...named].sort(
      (a, b) =>
        Math.abs(a.date.getTime() - txn.bookedAt.getTime()) -
        Math.abs(b.date.getTime() - txn.bookedAt.getTime())
    )[0]!;
  }
  return null;
}

/**
 * Tie money-out bank lines to landlord payouts and contractor jobs.
 * Lines that fit nothing are marked "unmatched" so they show as unexpected on Month end;
 * they are retried on every upload because a payout may be recorded later.
 */
export async function matchOutgoingBankTransactions(branchId: string) {
  const pending = await listUnmatchedOutgoingTransactions(branchId);
  if (!pending.length) return { matched: 0, unmatched: 0 };
  const candidates = await listExpectedOutgoings(branchId);
  let matched = 0;
  let unmatched = 0;

  for (const txn of pending) {
    const pick = pickOutgoingCandidate(
      {
        amount: Number(txn.amount),
        bookedAt: txn.bookedAt,
        description: txn.description,
        counterparty: txn.counterparty,
      },
      candidates
    );
    if (pick) {
      await updateBankTransaction(txn.id, {
        matchStatus: "matched",
        ...(pick.kind === "payout" ? { landlordPayoutId: pick.id } : { workOrderId: pick.id }),
      });
      candidates.splice(candidates.indexOf(pick), 1);
      matched += 1;
    } else {
      if (txn.matchStatus !== "unmatched") {
        await updateBankTransaction(txn.id, { matchStatus: "unmatched" });
      }
      unmatched += 1;
    }
  }
  return { matched, unmatched };
}

/** Manually tie an outgoing line to a payout or job, or mark it as expected (fee transfer, bank charge…). */
export async function resolveOutgoingTransaction(
  branchId: string,
  txnId: string,
  resolution:
    | { kind: "payout" | "contractor"; id: string }
    | { kind: "other"; note: string }
) {
  await ensureBankFeed();
  const [txn] = await db
    .select()
    .from(bankTransactions)
    .where(
      and(
        eq(bankTransactions.id, txnId),
        eq(bankTransactions.branchId, branchId),
        agencyEq(bankTransactions.agencyId)
      )
    )
    .limit(1);
  if (!txn || Number(txn.amount) >= 0) return null;
  const raw = typeof txn.raw === "object" && txn.raw ? (txn.raw as Record<string, unknown>) : {};

  if (resolution.kind === "other") {
    return updateBankTransaction(txn.id, {
      matchStatus: "ignored",
      raw: { ...raw, resolved_note: resolution.note, resolved_at: new Date().toISOString() },
    });
  }

  // Only link to records that aren't already tied to another bank line.
  const open = await listExpectedOutgoings(branchId);
  if (!open.some((c) => c.kind === resolution.kind && c.id === resolution.id)) return null;
  return updateBankTransaction(txn.id, {
    matchStatus: "matched",
    ...(resolution.kind === "payout"
      ? { landlordPayoutId: resolution.id }
      : { workOrderId: resolution.id }),
    raw: { ...raw, matched_manually: true },
  });
}

/** Undo a match or "expected" mark so the line is checked again on the next upload. */
export async function reopenOutgoingTransaction(branchId: string, txnId: string) {
  await ensureBankFeed();
  const [row] = await db
    .update(bankTransactions)
    .set({ matchStatus: "unmatched", landlordPayoutId: null, workOrderId: null })
    .where(
      and(
        eq(bankTransactions.id, txnId),
        eq(bankTransactions.branchId, branchId),
        lt(bankTransactions.amount, "0"),
        agencyEq(bankTransactions.agencyId)
      )
    )
    .returning();
  return row ?? null;
}
