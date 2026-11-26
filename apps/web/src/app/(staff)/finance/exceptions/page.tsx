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

  const under = rows.filter((r) => r.exception.kind === "underpayment").length;
  const unmatched = rows.filter((r) => r.exception.kind === "unmatched").length;

  return (
    <div>
      <AdminPageHeader
        title="Payment exceptions"
        description="Bank money we couldn't match to rent, and part payments, that need you to decide what happens."
      />
      <FinanceSubnav />

      <StatGrid columns={3}>
        <StatPill label="To sort out" value={rows.length} tone={rows.length ? "warning" : "success"} />
        <StatPill label="Not matched" value={unmatched} tone={unmatched ? "warning" : "neutral"} />
        <StatPill label="Part payments" value={under} tone={under ? "warning" : "neutral"} />
      </StatGrid>

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
