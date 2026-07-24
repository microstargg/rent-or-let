import {
  getActiveBankConnection,
  getBankConnectionById,
  getConnectionTokens,
  insertBankTransaction,
  listOpenInvoiceMatchCandidates,
  listPendingBankTransactions,
  updateBankConnection,
  updateBankTransaction,
  createUnmatchedException,
} from "@/lib/db/queries/bank-feed";
import { recordPaymentAndAllocate, getPaymentByExternalRef } from "@/lib/db/queries/finance";
import { matchBankTransaction } from "@/lib/bank-feed/match";
import {
  listTrueLayerTransactions,
  refreshTrueLayerToken,
  isTrueLayerConfigured,
} from "@/lib/truelayer/client";

async function ensureAccessToken(connectionId: string): Promise<string | null> {
  const connection = await getBankConnectionById(connectionId);
  if (!connection) return null;

  const tokens = getConnectionTokens(connection);
  if (!tokens.accessToken) return null;

  if (tokens.refreshToken && isTrueLayerConfigured()) {
    try {
      const refreshed = await refreshTrueLayerToken(tokens.refreshToken);
      await updateBankConnection(connection.id, { tokens: refreshed });
      return refreshed.access_token;
    } catch {
      // Fall back to existing access token
    }
  }
  return tokens.accessToken;
}

export async function syncBankFeedForBranch(branchId: string): Promise<{
  synced: number;
  matched: number;
  exceptions: number;
  skipped: number;
  error?: string;
}> {
  const connection = await getActiveBankConnection(branchId);
  if (!connection || !connection.accountId) {
    return { synced: 0, matched: 0, exceptions: 0, skipped: 0, error: "No active bank connection" };
  }

  let created = 0;

  if (isTrueLayerConfigured() && connection.accessTokenEnc) {
    const accessToken = await ensureAccessToken(connection.id);
    if (!accessToken) {
      return { synced: 0, matched: 0, exceptions: 0, skipped: 0, error: "Missing access token" };
    }

    const to = new Date();
    const from = connection.lastSyncedAt
      ? new Date(connection.lastSyncedAt.getTime() - 2 * 86400000)
      : new Date(to.getTime() - 30 * 86400000);

    const txns = await listTrueLayerTransactions(
      accessToken,
      connection.accountId,
      from.toISOString(),
      to.toISOString()
    );

    for (const txn of txns) {
      if (txn.amount <= 0) continue;
      const result = await insertBankTransaction({
        branchId,
        connectionId: connection.id,
        providerTxnId: txn.transaction_id,
        bookedAt: new Date(txn.timestamp),
        amount: txn.amount,
        currency: txn.currency || "GBP",
        description: txn.description ?? null,
        counterparty: txn.merchant_name ?? null,
        raw: txn as unknown as Record<string, unknown>,
      });
      if (result.created) created += 1;
    }

    await updateBankConnection(connection.id, { lastSyncedAt: new Date() });
  }

  const matchResult = await matchPendingBankTransactions(branchId);
  return {
    synced: created,
    matched: matchResult.matched,
    exceptions: matchResult.exceptions,
    skipped: matchResult.skipped,
  };
}

export async function matchPendingBankTransactions(branchId: string): Promise<{
  matched: number;
  exceptions: number;
  skipped: number;
}> {
  const pending = await listPendingBankTransactions(branchId);
  const candidates = await listOpenInvoiceMatchCandidates(branchId);
  let matched = 0;
  let exceptions = 0;
  const skipped = 0;

  for (const txn of pending) {
    const amount = Number(txn.amount);
    const result = matchBankTransaction(
      {
        amount,
        description: txn.description,
        counterparty: txn.counterparty,
        bookedAt: txn.bookedAt,
      },
      candidates
    );

    if (result.confidence === "high" && result.invoiceId && result.tenancyId) {
      const externalRef =
        txn.providerTxnId.startsWith("csv_") || txn.providerTxnId.startsWith("tl_")
          ? txn.providerTxnId
          : `tl_${txn.providerTxnId}`;
      const existing = await getPaymentByExternalRef(branchId, externalRef);
      if (existing) {
        await updateBankTransaction(txn.id, {
          matchStatus: "matched",
          paymentId: existing.id,
          invoiceId: result.invoiceId,
          tenancyId: result.tenancyId,
        });
        matched += 1;
        continue;
      }
      const posted = await recordPaymentAndAllocate({
        branchId,
        tenancyId: result.tenancyId,
        invoiceId: result.invoiceId,
        amount,
        method: "bank_transfer",
        externalRef,
      });
      if (posted?.payment) {
        await updateBankTransaction(txn.id, {
          matchStatus: "matched",
          paymentId: posted.payment.id,
          invoiceId: result.invoiceId,
          tenancyId: result.tenancyId,
        });
        const idx = candidates.findIndex((c) => c.invoiceId === result.invoiceId);
        if (idx >= 0) {
          candidates[idx] = {
            ...candidates[idx],
            remaining: Math.max(0, candidates[idx].remaining - amount),
          };
          if (candidates[idx].remaining < 0.011) candidates.splice(idx, 1);
        }
        matched += 1;
        continue;
      }
    }

    const noteParts = [
      txn.description || "Bank credit",
      txn.counterparty ? `from ${txn.counterparty}` : null,
      result.reason !== "Ambiguous" ? result.reason : null,
    ].filter(Boolean);

    const exception = await createUnmatchedException({
      branchId,
      bankTransactionId: txn.id,
      amount,
      note: noteParts.join(" · "),
      suggestedInvoiceId: result.invoiceId,
      suggestedTenancyId: result.tenancyId,
    });
    await updateBankTransaction(txn.id, {
      matchStatus: "exception",
      exceptionId: exception.id,
      invoiceId: result.invoiceId,
      tenancyId: result.tenancyId,
    });
    exceptions += 1;
  }

  return { matched, exceptions, skipped };
}

/** Insert a synthetic credit (tests / manual ingest) then run matching. */
export async function ingestAndMatchBankCredit(data: {
  branchId: string;
  connectionId: string;
  providerTxnId: string;
  amount: number;
  bookedAt?: Date;
  description?: string | null;
  counterparty?: string | null;
}) {
  const { row, created } = await insertBankTransaction({
    branchId: data.branchId,
    connectionId: data.connectionId,
    providerTxnId: data.providerTxnId,
    bookedAt: data.bookedAt ?? new Date(),
    amount: data.amount,
    description: data.description ?? null,
    counterparty: data.counterparty ?? null,
  });
  if (!created) return { transaction: row, alreadyExisted: true as const };
  const matchResult = await matchPendingBankTransactions(data.branchId);
  const { getBankTransactionById } = await import("@/lib/db/queries/bank-feed");
  const refreshed = await getBankTransactionById(row.id);
  return { transaction: refreshed ?? row, alreadyExisted: false as const, matchResult };
}
