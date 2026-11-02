import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencyEq, currentAgencyId } from "@/lib/db/agency-scope";
import { bankConnections } from "@/lib/db/schema";
import { ensureBankFeed, insertBankTransaction } from "@/lib/db/queries/bank-feed";
import { matchPendingBankTransactions } from "@/lib/bank-feed/sync";
import { matchOutgoingBankTransactions } from "@/lib/bank-feed/match-outgoing";
import {
  accountMask,
  deleteSession,
  listAccountTransactions,
  type EbSession,
  type EbTransaction,
  type EnableBankingConfig,
} from "@/lib/bank-feed/enable-banking";
import { createHash } from "node:crypto";

export const ENABLE_BANKING_PROVIDER = "enable_banking";

/** How far back the first sync reads. Later syncs overlap the last one by a week. */
const FIRST_SYNC_DAYS = 90;
const OVERLAP_DAYS = 7;

export async function listEnableBankingConnections(branchId: string) {
  await ensureBankFeed();
  return db
    .select()
    .from(bankConnections)
    .where(
      and(
        agencyEq(bankConnections.agencyId),
        eq(bankConnections.branchId, branchId),
        eq(bankConnections.provider, ENABLE_BANKING_PROVIDER)
      )
    )
    .orderBy(bankConnections.createdAt);
}

/** Store each account the customer shared as its own connection row (re-linking reuses the row). */
export async function saveEnableBankingSession(branchId: string, session: EbSession) {
  const existing = await listEnableBankingConnections(branchId);
  const consentExpiresAt = session.access?.valid_until ? new Date(session.access.valid_until) : null;
  const saved = [];
  for (const account of session.accounts) {
    const mask = accountMask(account);
    const values = {
      status: "active",
      providerUserId: session.session_id,
      accountId: account.uid,
      accountName: account.name || account.product || session.aspsp.name,
      accountNumberMask: mask.account,
      sortCodeMask: mask.sortCode,
      consentExpiresAt,
      meta: {
        sessionId: session.session_id,
        bank: session.aspsp.name,
        country: session.aspsp.country,
        currency: account.currency ?? null,
      },
      updatedAt: new Date(),
    };
    const match = existing.find(
      (c) =>
        c.accountId === account.uid ||
        (mask.account &&
          c.accountNumberMask === mask.account &&
          (c.meta as { bank?: string } | null)?.bank === session.aspsp.name)
    );
    if (match) {
      const [row] = await db
        .update(bankConnections)
        .set(values)
        .where(and(eq(bankConnections.id, match.id), agencyEq(bankConnections.agencyId)))
        .returning();
      saved.push(row);
    } else {
      const [row] = await db
        .insert(bankConnections)
        .values({
          agencyId: currentAgencyId(),
          branchId,
          provider: ENABLE_BANKING_PROVIDER,
          ...values,
        })
        .returning();
      saved.push(row);
    }
  }
  return saved;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Stable id per bank line, so re-syncing never double-counts. */
export function enableBankingTxnId(accountUid: string, txn: EbTransaction): string {
  const bankId = txn.entry_reference || txn.transaction_id;
  const raw = bankId
    ? `${accountUid}|${bankId}`
    : `${accountUid}|${txn.booking_date ?? txn.value_date}|${txn.transaction_amount.amount}|${txn.credit_debit_indicator}|${(txn.remittance_information ?? []).join(" ")}`;
  return `eb_${createHash("sha256").update(raw).digest("hex").slice(0, 24)}`;
}

/** Signed amount: positive is money in. */
export function signedAmount(txn: EbTransaction): number {
  const value = Math.abs(Number(txn.transaction_amount.amount));
  if (txn.credit_debit_indicator === "DBIT") return -value;
  if (txn.credit_debit_indicator === "CRDT") return value;
  // Some banks sign the amount instead of setting the indicator.
  return Number(txn.transaction_amount.amount);
}

function describe(txn: EbTransaction): { description: string; counterparty: string | null } {
  const credit = txn.credit_debit_indicator !== "DBIT";
  const counterparty = (credit ? txn.debtor?.name : txn.creditor?.name) ?? null;
  const parts = [...(txn.remittance_information ?? []), txn.reference_number, txn.note].filter(
    (s): s is string => Boolean(s && s.trim())
  );
  const description = parts.join(" ").trim() || counterparty || (credit ? "Bank credit" : "Bank debit");
  return { description, counterparty };
}

export interface EnableBankingSyncResult {
  accounts: number;
  fetched: number;
  imported: number;
  duplicates: number;
  pendingSkipped: number;
  matched: number;
  exceptions: number;
  outgoingMatched: number;
  outgoingUnmatched: number;
  errors: string[];
}

export async function syncEnableBankingForBranch(
  config: EnableBankingConfig,
  branchId: string,
  opts: { connectionIds?: string[] } = {}
): Promise<EnableBankingSyncResult> {
  const connections = (await listEnableBankingConnections(branchId)).filter(
    (c) => c.status === "active" && c.accountId && (!opts.connectionIds || opts.connectionIds.includes(c.id))
  );
  const result: EnableBankingSyncResult = {
    accounts: connections.length,
    fetched: 0,
    imported: 0,
    duplicates: 0,
    pendingSkipped: 0,
    matched: 0,
    exceptions: 0,
    outgoingMatched: 0,
    outgoingUnmatched: 0,
    errors: [],
  };

  for (const connection of connections) {
    const now = new Date();
    const from = connection.lastSyncedAt
      ? new Date(connection.lastSyncedAt.getTime() - OVERLAP_DAYS * 86400_000)
      : new Date(now.getTime() - FIRST_SYNC_DAYS * 86400_000);
    let txns: EbTransaction[];
    try {
      txns = await listAccountTransactions(config, connection.accountId!, isoDate(from));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      result.errors.push(`${connection.accountName ?? "Account"}: ${message}`);
      const status = (err as { status?: number }).status;
      // 401/403 from the bank side usually means the consent has ended.
      if (status === 401 || status === 403) {
        await db
          .update(bankConnections)
          .set({ status: "expired", updatedAt: new Date() })
          .where(and(eq(bankConnections.id, connection.id), agencyEq(bankConnections.agencyId)));
      }
      continue;
    }
    result.fetched += txns.length;

    for (const txn of txns) {
      // Pending card lines change or vanish; only booked lines go into the ledger.
      if (txn.status && txn.status !== "BOOK") {
        result.pendingSkipped += 1;
        continue;
      }
      const date = txn.booking_date || txn.value_date || txn.transaction_date;
      if (!date) continue;
      const { description, counterparty } = describe(txn);
      const { created } = await insertBankTransaction({
        branchId,
        connectionId: connection.id,
        providerTxnId: enableBankingTxnId(connection.accountId!, txn),
        bookedAt: new Date(`${date.slice(0, 10)}T12:00:00.000Z`),
        amount: signedAmount(txn),
        currency: txn.transaction_amount.currency || "GBP",
        description,
        counterparty,
        raw: txn as unknown as Record<string, unknown>,
      });
      if (created) result.imported += 1;
      else result.duplicates += 1;
    }

    await db
      .update(bankConnections)
      .set({ lastSyncedAt: now, updatedAt: now })
      .where(and(eq(bankConnections.id, connection.id), agencyEq(bankConnections.agencyId)));
  }

  const matchResult = await matchPendingBankTransactions(branchId);
  const outgoing = await matchOutgoingBankTransactions(branchId);
  result.matched = matchResult.matched;
  result.exceptions = matchResult.exceptions;
  result.outgoingMatched = outgoing.matched;
  result.outgoingUnmatched = outgoing.unmatched;
  return result;
}

/** Revoke the consent at Enable Banking and stop syncing. Imported lines are kept. */
export async function disconnectEnableBanking(
  config: EnableBankingConfig,
  branchId: string,
  connectionId: string
) {
  const connections = await listEnableBankingConnections(branchId);
  const target = connections.find((c) => c.id === connectionId);
  if (!target) return null;
  const sessionId = target.providerUserId;
  if (sessionId) {
    try {
      await deleteSession(config, sessionId);
    } catch {
      // Already expired or revoked at the bank; still mark it here.
    }
  }
  // Every account shared in that session loses access together.
  const affected = connections.filter((c) => (sessionId ? c.providerUserId === sessionId : c.id === connectionId));
  for (const c of affected) {
    await db
      .update(bankConnections)
      .set({ status: "revoked", updatedAt: new Date() })
      .where(and(eq(bankConnections.id, c.id), agencyEq(bankConnections.agencyId)));
  }
  return affected.length;
}
