import {
  listPaymentExceptions,
  getDefaultBranch,
  listOpenInvoiceMatchCandidates,
} from "@/lib/db/queries";
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
import { formatDate } from "@/lib/utils";

export default async function AdminExceptionsPage() {
  const branch = await getDefaultBranch();
  const rows = branch ? await listPaymentExceptions(branch.id) : [];
  const openInvoices = branch ? await listOpenInvoiceMatchCandidates(branch.id) : [];
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
        description="Overpayments, underpayments, and unmatched bank receipts that need a human decision."
      />
      <FinanceSubnav />

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <StatPill label="Open exceptions" value={rows.length} tone={rows.length ? "warning" : "success"} />
        <StatPill label="Unmatched" value={unmatched} tone={unmatched ? "warning" : "neutral"} />
        <StatPill label="Overpayments" value={over} tone={over ? "info" : "neutral"} />
        <StatPill label="Underpayments" value={under} tone={under ? "warning" : "neutral"} />
      </div>

      <AdminSection
        title="Open queue"
        description="Allocate unmatched bank credits, or resolve once you’ve refunded / accepted a variance"
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
                    <span className="font-semibold">£{Number(exception.amount).toFixed(2)}</span>
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
                    suggestedInvoiceId={
                      ((exception.meta as { suggestedInvoiceId?: string } | null)?.suggestedInvoiceId ??
                        exception.invoiceId) ||
                      null
                    }
                  />
                ) : (
                  <ResolveExceptionButton id={exception.id} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="Queue clear"
            description="No open payment exceptions. New partials, overpays, and unmatched bank credits will appear here."
          />
        )}
      </AdminSection>
    </div>
  );
}
