import {
  listPaymentExceptions,
  getDefaultBranch,
  listOpenInvoiceMatchCandidates,
  listTenancies,
} from "@/lib/db/queries";
import Link from "next/link";
import { displayPersonName } from "@/lib/person-name";
import { ResolveExceptionButton } from "@/components/admin/resolve-exception-button";
import { UnmatchedExceptionActions } from "@/components/admin/unmatched-exception-actions";
import { FinanceSubnav } from "@/components/admin/finance-subnav";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  StatGrid,
  StatusBadge,
  StatPill,
} from "@/components/admin/admin-page";
import { StatementCsvImport } from "@/components/admin/statement-csv-import";
import { formatDay, formatMoney } from "@/lib/utils";
import { BankMismatchActions, TickNotInBankActions } from "@/components/admin/bank-check-actions";
import { BANK_MISMATCH, listTicksNotInBank, listUnmatchedBankCredits } from "@/lib/db/queries/bank-check";

export default async function AdminExceptionsPage() {
  const branch = await getDefaultBranch();
  const rows = branch ? await listPaymentExceptions(branch.id) : [];
  const [openInvoices, tenancyRows] = branch
    ? await Promise.all([listOpenInvoiceMatchCandidates(branch.id), listTenancies(branch.id)])
    : [[], []];
  const [ticks, bankCredits] = branch
    ? await Promise.all([listTicksNotInBank(branch.id), listUnmatchedBankCredits(branch.id)])
    : [{ coverage: { first: null, last: null }, rows: [] }, []];
  const bankLinesFor = (amount: number) =>
    bankCredits
      .filter((b) => Math.abs(Number(b.amount) - amount) < 0.011)
      .map((b) => ({
        id: b.id,
        label: `${formatDay(b.bookedAt)} · ${formatMoney(Number(b.amount))}${b.description ? ` · ${b.description.slice(0, 40)}` : ""}`,
      }));
  const tenancyOptions = tenancyRows
    .filter((t) => t.tenancy.status !== "ended")
    .map((t) => ({
      id: t.tenancy.id,
      label: `${displayPersonName(t.renterFirstName, t.renterLastName)} · ${t.propertyAddress}`,
    }));
  const invoiceOptions = openInvoices.map((c) => ({
    id: c.invoiceId,
    label: `${c.renterName} · ${c.propertyAddress}`,
    remaining: c.remaining,
  }));

  const under = rows.filter((r) => r.exception.kind === "underpayment").length;
  const unmatched = rows.filter((r) => r.exception.kind === "unmatched").length;
  const mismatches = rows.filter((r) => r.exception.kind === BANK_MISMATCH).length;

  return (
    <div>
      <AdminPageHeader
        title="Payment exceptions"
        description="Bank money we couldn't match to rent, and part payments, that need you to decide what happens."
      />
      <FinanceSubnav />

      <StatGrid columns={4}>
        <StatPill label="To sort out" value={rows.length + ticks.rows.length} tone={rows.length + ticks.rows.length ? "warning" : "success"} />
        <StatPill label="Not matched" value={unmatched} tone={unmatched ? "warning" : "neutral"} />
        <StatPill
          label="Bank check"
          value={mismatches + ticks.rows.length}
          hint={mismatches ? `${mismatches} amount${mismatches === 1 ? "" : "s"} differ` : undefined}
          tone={mismatches + ticks.rows.length ? "warning" : "neutral"}
        />
        <StatPill label="Part payments" value={under} tone={under ? "warning" : "neutral"} />
      </StatGrid>

      {ticks.rows.length > 0 && (
        <AdminSection
          title="Marked as received, not in the bank"
          description={`Rent someone ticked as received that the bank statements${
            ticks.coverage.last ? ` (up to ${formatDay(ticks.coverage.last)})` : ""
          } don't show. Pair it with the bank line, undo the tick if the money never came, or mark it fine if it was paid another way.`}
        >
          <div className="space-y-2">
            {ticks.rows.map((t) => (
              <div
                key={t.paymentId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status="not_in_bank" tone="warning" />
                    <span className="font-semibold">{formatMoney(t.amount)}</span>
                  </div>
                  <p className="mt-1 text-sm">
                    {t.tenancyId ? (
                      <Link href={`/tenancies/${t.tenancyId}?tab=money`} className="hover:underline">
                        {t.renterName} · {t.propertyAddress}
                      </Link>
                    ) : (
                      `${t.renterName} · ${t.propertyAddress}`
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Marked as received {formatDay(t.paidAt)}</p>
                </div>
                <TickNotInBankActions paymentId={t.paymentId} bankLines={bankLinesFor(t.amount)} />
              </div>
            ))}
          </div>
        </AdminSection>
      )}

      <AdminSection
        title="To sort out"
        description="Match bank money to a rent invoice, or hold it as credit if the tenant paid ahead."
      >
        {rows.length ? (
          <div className="space-y-2">
            {rows.map(({ exception, propertyAddress, renterFirstName, renterLastName }) => {
              const tenant =
                renterFirstName || renterLastName ? displayPersonName(renterFirstName ?? "", renterLastName ?? "") : null;
              return (
              <div
                key={exception.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={exception.kind} />
                    <span className="font-semibold">{formatMoney(Number(exception.amount))}</span>
                  </div>
                  <p className="mt-1 text-sm">
                    {exception.kind === "unmatched"
                      ? "Money in the bank we couldn't match"
                      : exception.kind === BANK_MISMATCH
                        ? `Bank shows a different amount · ${[tenant, propertyAddress].filter(Boolean).join(" · ")}`
                      : [tenant, propertyAddress].filter(Boolean).join(" · ") || "Tenancy not linked"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[exception.createdAt ? formatDay(exception.createdAt) : null, exception.note]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {exception.kind === "underpayment" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      The rest stays owing on the invoice and shows on Balances.
                    </p>
                  )}
                </div>
                {exception.kind === BANK_MISMATCH ? (
                  <BankMismatchActions exceptionId={exception.id} />
                ) : exception.kind === "unmatched" ? (
                  <UnmatchedExceptionActions
                    exceptionId={exception.id}
                    invoices={invoiceOptions}
                    tenancies={tenancyOptions}
                    suggestedInvoiceId={
                      ((exception.meta as { suggestedInvoiceId?: string } | null)?.suggestedInvoiceId ??
                        exception.invoiceId) ||
                      null
                    }
                  />
                ) : (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {exception.tenancyId && (
                      <Link
                        href={`/tenancies/${exception.tenancyId}?tab=money`}
                        className="text-sm text-primary hover:underline"
                      >
                        {exception.kind === "overpayment" ? "See credit" : "See rent account"}
                      </Link>
                    )}
                    <ResolveExceptionButton
                      id={exception.id}
                      label={exception.kind === "overpayment" ? "Keep as credit" : "Leave the rest owing"}
                    />
                  </div>
                )}
              </div>
              );
            })}
          </div>
        ) : (
          <AdminEmptyState
            title="Nothing to sort out"
            description="Part payments and bank money we can't match show up here."
          />
        )}
      </AdminSection>

      <details className="mt-6 rounded-xl border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Upload a bank statement</summary>
        <div className="border-t p-4">
          <StatementCsvImport />
        </div>
      </details>
    </div>
  );
}
