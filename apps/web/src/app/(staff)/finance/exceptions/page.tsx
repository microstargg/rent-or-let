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
  StatusBadge,
  StatPill,
} from "@/components/admin/admin-page";
import { StatementCsvImport } from "@/components/admin/statement-csv-import";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function AdminExceptionsPage() {
  const branch = await getDefaultBranch();
  const rows = branch ? await listPaymentExceptions(branch.id) : [];
  const [openInvoices, tenancyRows] = branch
    ? await Promise.all([listOpenInvoiceMatchCandidates(branch.id), listTenancies(branch.id)])
    : [[], []];
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

  const over = rows.filter((r) => r.exception.kind === "overpayment").length;
  const under = rows.filter((r) => r.exception.kind === "underpayment").length;
  const unmatched = rows.filter((r) => r.exception.kind === "unmatched").length;

  return (
    <div>
      <AdminPageHeader
        title="Payment exceptions"
        description="Bank receipts that couldn't be matched, and partial payments, that need a human decision. Overpayments are kept as tenant credit on Balances."
      />
      <FinanceSubnav />

      <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatPill label="Open exceptions" value={rows.length} tone={rows.length ? "warning" : "success"} />
        <StatPill label="Unmatched" value={unmatched} tone={unmatched ? "warning" : "neutral"} />
        <StatPill label="Overpayments" value={over} tone={over ? "info" : "neutral"} />
        <StatPill label="Underpayments" value={under} tone={under ? "warning" : "neutral"} />
      </div>

      <div className="mt-6">
        <StatementCsvImport />
      </div>

      <AdminSection
        title="Open queue"
        description="Allocate unmatched bank credits to rent, or add them to a tenancy as credit if the tenant paid ahead"
      >
        {rows.length ? (
          <div className="space-y-2">
            {rows.map(({ exception, propertyAddress }) => (
              <div
                key={exception.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={exception.kind} />
                    <span className="font-semibold">{formatMoney(Number(exception.amount))}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {exception.kind === "unmatched"
                      ? "Unmatched bank credit"
                      : (propertyAddress ?? "Unlinked tenancy")}
                    {exception.note ? ` · ${exception.note}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {exception.createdAt ? formatDate(exception.createdAt) : ""}
                  </p>
                </div>
                {exception.kind === "unmatched" ? (
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
                ) : exception.kind === "overpayment" ? (
                  <div className="flex flex-col items-end gap-1">
                    {exception.tenancyId && (
                      <Link href={`/tenancies/${exception.tenancyId}`} className="text-xs text-primary hover:underline">
                        Now held as credit on the tenancy
                      </Link>
                    )}
                    <ResolveExceptionButton id={exception.id} />
                  </div>
                ) : (
                  <ResolveExceptionButton id={exception.id} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="Queue clear"
            description="No open payment exceptions. Partial payments and unmatched bank credits will appear here."
          />
        )}
      </AdminSection>
    </div>
  );
}
