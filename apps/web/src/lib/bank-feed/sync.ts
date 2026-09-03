import {
  listOpenInvoiceMatchCandidates,
  listPendingBankTransactions,
  updateBankTransaction,
  createUnmatchedException,
  insertBankTransaction,
} from "@/lib/db/queries/bank-feed";
import { recordPaymentAndAllocate, getPaymentByExternalRef } from "@/lib/db/queries/finance";
import { matchBankTransaction } from "@/lib/bank-feed/match";

function paymentExternalRef(providerTxnId: string): string {
  if (providerTxnId.startsWith("csv_") || providerTxnId.startsWith("tl_")) return providerTxnId;
  return `csv_${providerTxnId}`;
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
      const externalRef = paymentExternalRef(txn.providerTxnId);
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

/** Insert a synthetic credit then run matching. */
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
