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
import { parseJsonBody } from "@/lib/api-validation";

const bodySchema = z.object({
  action: z.string(),
  exceptionId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  landlordId: z.string().uuid().optional(),
  tenancyId: z.string().uuid().optional(),
  paymentId: z.string().uuid().optional(),
  bankTransactionId: z.string().uuid().optional(),
  choice: z.enum(["keep_tick", "use_bank"]).optional(),
});

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });

  const parsed = await parseJsonBody(request, bodySchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  if (body.action === "apply_late_fees") {
    const result = await applyLateFeesForBranch(branch.id);
    return NextResponse.json(result);
  }

  if (body.action === "nrl_withhold" && body.landlordId) {
    const { listNrlWithholdLandlords, withholdNrlTax } = await import("@/lib/db/queries/landlord-finance");
    const { nrlTaxDue, previousNrlQuarter, summariseForTax } = await import("@/lib/finance/tax");
    const quarter = previousNrlQuarter(new Date());
    const rows = await listNrlWithholdLandlords(branch.id, quarter);
    const row = rows.find((r) => r.landlord.id === body.landlordId);
    if (!row) return NextResponse.json({ error: "Landlord isn't set to have NRL tax withheld" }, { status: 400 });
    const due = nrlTaxDue(summariseForTax(row.lines));
    if (due <= 0) return NextResponse.json({ withheld: 0 });
    await withholdNrlTax({
      branchId: branch.id,
      landlordId: row.landlord.id,
      amount: due,
      quarterKey: quarter.key,
      quarterLabel: quarter.label,
    });
    return NextResponse.json({ withheld: due });
  }

  // Weekly bank check: settle ticks the bank statement doesn't back up.
  if (body.action === "bank_mismatch" && body.exceptionId && body.choice) {
    const { resolveBankMismatch } = await import("@/lib/db/queries/bank-check");
    const result = await resolveBankMismatch(branch.id, body.exceptionId, body.choice);
    return "error" in result ? NextResponse.json(result, { status: 400 }) : NextResponse.json(result);
  }
  if (body.action === "undo_tick" && body.paymentId) {
    const { undoHandPayment } = await import("@/lib/db/queries/bank-check");
    const result = await undoHandPayment(branch.id, body.paymentId);
    return "error" in result ? NextResponse.json(result, { status: 400 }) : NextResponse.json(result);
  }
  if (body.action === "dismiss_tick" && body.paymentId) {
    const { dismissTickCheck } = await import("@/lib/db/queries/bank-check");
    const row = await dismissTickCheck(branch.id, body.paymentId);
    return row ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (body.action === "link_tick" && body.paymentId && body.bankTransactionId) {
    const { linkBankLineToTick } = await import("@/lib/db/queries/bank-check");
    const result = await linkBankLineToTick(branch.id, body.bankTransactionId, body.paymentId);
    return "error" in result ? NextResponse.json(result, { status: 400 }) : NextResponse.json(result);
  }

  if (body.action === "raise_rent") {
    const { raiseRentInvoices } = await import("@/lib/operations/rent/generate-invoices");
    const result = await raiseRentInvoices(branch.id);
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
    if (!invoice.tenancyId) {
      return NextResponse.json({ error: "Invoice has no tenancy" }, { status: 400 });
    }
    if (invoice.status === "paid" || invoice.status === "void") {
      return NextResponse.json({ error: "Invoice not open" }, { status: 400 });
    }

    const amount = Number(exception.amount);
    const externalRef =
      /^(csv|pdf|tl)_/.test(bankTxn.providerTxnId)
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
      paidAt: bankTxn.bookedAt,
      spillToTenancy: true,
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

  // Money from a tenant with nothing due yet (paying ahead): hold it as their credit.
  if (body.action === "credit_unmatched" && body.exceptionId && body.tenancyId) {
    const exception = await getPaymentExceptionById(body.exceptionId);
    if (!exception || exception.branchId !== branch.id || exception.status !== "open" || exception.kind !== "unmatched") {
      return NextResponse.json({ error: "Exception not found" }, { status: 404 });
    }
    const bankTxnId = (exception.meta as { bankTransactionId?: string } | null)?.bankTransactionId;
    const bankTxn = bankTxnId ? await getBankTransactionById(bankTxnId) : null;
    if (!bankTxn || bankTxn.branchId !== branch.id) {
      return NextResponse.json({ error: "Bank transaction not found" }, { status: 404 });
    }
    const { getTenancyById } = await import("@/lib/db/queries");
    const tenancy = await getTenancyById(body.tenancyId);
    if (!tenancy || tenancy.tenancy.branchId !== branch.id) {
      return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
    }
    const externalRef = /^(csv|pdf|tl|eb)_/.test(bankTxn.providerTxnId)
      ? bankTxn.providerTxnId
      : `csv_${bankTxn.providerTxnId}`;
    const { addTenantCredit, applyTenantCredit } = await import("@/lib/db/queries/tenant-credit");
    const existing = await getPaymentByExternalRef(branch.id, externalRef);
    const payment =
      existing ??
      (await addTenantCredit({
        tenancyId: body.tenancyId,
        amount: Number(exception.amount),
        paidAt: bankTxn.bookedAt,
        method: "bank_transfer",
        externalRef,
        memo: "Payment received ahead, held as credit",
      }));
    if (!payment) return NextResponse.json({ error: "Failed to record payment" }, { status: 400 });
    await updateBankTransaction(bankTxn.id, {
      matchStatus: "matched",
      paymentId: payment.id,
      tenancyId: body.tenancyId,
    });
    await resolvePaymentException(exception.id);
    // Anything already due is paid from it straight away; the rest waits for its due date.
    const applied = await applyTenantCredit(body.tenancyId);
    return NextResponse.json({ ok: true, payment, applied });
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
