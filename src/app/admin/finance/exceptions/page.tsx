import { listPaymentExceptions, getDefaultBranch } from "@/lib/db/queries";
import { ResolveExceptionButton } from "@/components/admin/resolve-exception-button";
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
  const over = rows.filter((r) => r.exception.kind === "overpayment").length;
  const under = rows.filter((r) => r.exception.kind === "underpayment").length;

  return (
    <div>
      <AdminPageHeader
        title="Payment exceptions"
        description="Overpayments, underpayments, and unmatched receipts that need a human decision."
      />
      <FinanceSubnav />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatPill label="Open exceptions" value={rows.length} tone={rows.length ? "warning" : "success"} />
        <StatPill label="Overpayments" value={over} tone={over ? "info" : "neutral"} />
        <StatPill label="Underpayments" value={under} tone={under ? "warning" : "neutral"} />
      </div>

      <AdminSection title="Open queue" description="Resolve once you’ve refunded, reallocated, or accepted the variance">
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
                    {propertyAddress ?? "Unlinked tenancy"}
                    {exception.note ? ` · ${exception.note}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {exception.createdAt
                      ? formatDate(exception.createdAt)
                      : ""}
                  </p>
                </div>
                <ResolveExceptionButton id={exception.id} />
              </div>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="Queue clear"
            description="No open payment exceptions. New partials and overpays will appear here automatically."
          />
        )}
      </AdminSection>
    </div>
  );
}
