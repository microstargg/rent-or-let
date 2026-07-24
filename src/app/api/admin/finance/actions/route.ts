import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import {
  getDefaultBranch,
  applyLateFeesForBranch,
  resolvePaymentException,
  getInvoiceById,
  recordPaymentAndAllocate,
  getPaymentByExternalRef,
} from "@/lib/db/queries";
import {
  getBankTransactionById,
  getPaymentExceptionById,
  updateBankTransaction,
} from "@/lib/db/queries/bank-feed";

const bodySchema = z.object({
  action: z.string(),
  exceptionId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });

  const body = bodySchema.parse(await request.json());

  if (body.action === "apply_late_fees") {
    const result = await applyLateFeesForBranch(branch.id);
    return NextResponse.json(result);
  }

  if (body.action === "resolve_exception" && body.exceptionId) {
    const row = await resolvePaymentException(body.exceptionId);
    return NextResponse.json(row);
  }

  if (body.action === "allocate_unmatched" && body.exceptionId && body.invoiceId) {
    const exception = await getPaymentExceptionById(body.exceptionId);
    if (!exception || exception.branchId !== branch.id || exception.status !== "open") {
      return NextResponse.json({ error: "Exception not found" }, { status: 404 });
    }
    if (exception.kind !== "unmatched") {
      return NextResponse.json({ error: "Not an unmatched receipt" }, { status: 400 });
    }

    const meta = (exception.meta ?? {}) as { bankTransactionId?: string };
    const bankTxnId = meta.bankTransactionId;
    if (!bankTxnId) {
      return NextResponse.json({ error: "Missing bank transaction" }, { status: 400 });
    }
    const bankTxn = await getBankTransactionById(bankTxnId);
    if (!bankTxn || bankTxn.branchId !== branch.id) {
      return NextResponse.json({ error: "Bank transaction not found" }, { status: 404 });
    }

    const invoice = await getInvoiceById(body.invoiceId);
    if (!invoice || invoice.branchId !== branch.id) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (invoice.status === "paid" || invoice.status === "void") {
      return NextResponse.json({ error: "Invoice not open" }, { status: 400 });
    }

    const amount = Number(exception.amount);
    const externalRef =
      bankTxn.providerTxnId.startsWith("csv_") || bankTxn.providerTxnId.startsWith("tl_")
        ? bankTxn.providerTxnId
        : `csv_${bankTxn.providerTxnId}`;
    const existing = await getPaymentByExternalRef(branch.id, externalRef);
    if (existing) {
      await updateBankTransaction(bankTxn.id, {
        matchStatus: "matched",
        paymentId: existing.id,
        invoiceId: invoice.id,
        tenancyId: invoice.tenancyId,
      });
      await resolvePaymentException(exception.id);
      return NextResponse.json({ ok: true, payment: existing, duplicate: true });
    }

    const posted = await recordPaymentAndAllocate({
      branchId: branch.id,
      tenancyId: invoice.tenancyId,
      invoiceId: invoice.id,
      amount,
      method: "bank_transfer",
      externalRef,
    });

    if (!posted?.payment) {
      return NextResponse.json({ error: "Failed to record payment" }, { status: 400 });
    }

    await updateBankTransaction(bankTxn.id, {
      matchStatus: "matched",
      paymentId: posted.payment.id,
      invoiceId: invoice.id,
      tenancyId: invoice.tenancyId,
    });
    await resolvePaymentException(exception.id);

    return NextResponse.json({ ok: true, payment: posted.payment, invoice: posted.invoice });
  }

  if (body.action === "ignore_unmatched" && body.exceptionId) {
    const exception = await getPaymentExceptionById(body.exceptionId);
    if (!exception || exception.branchId !== branch.id || exception.status !== "open") {
      return NextResponse.json({ error: "Exception not found" }, { status: 404 });
    }

    const meta = (exception.meta ?? {}) as { bankTransactionId?: string };
    if (meta.bankTransactionId) {
      await updateBankTransaction(meta.bankTransactionId, { matchStatus: "ignored" });
    }
    const row = await resolvePaymentException(exception.id);
    return NextResponse.json({ ok: true, exception: row });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
