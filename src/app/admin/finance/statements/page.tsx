import Link from "next/link";
import {
  getDefaultBranch,
  listLandlordStatements,
  listLandlordBalances,
} from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import { LandlordStatementActions } from "@/components/admin/landlord-statement-actions";
import { FinanceSubnav } from "@/components/admin/finance-subnav";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  StatusBadge,
  StatPill,
} from "@/components/admin/admin-page";
import { formatCurrency } from "@/lib/utils";

export default async function LandlordStatementsPage() {
  const branch = await getDefaultBranch();
  const statements = branch ? await listLandlordStatements(branch.id) : [];
  const balances = branch ? await listLandlordBalances(branch.id) : [];
  const due = balances.filter((b) => b.balance > 0.001);
  const dueTotal = due.reduce((sum, b) => sum + b.balance, 0);

  return (
    <div>
      <AdminPageHeader
        title="Landlord statements"
        description="Generate period statements from the landlord ledger. Approved jobs dated in the period appear as works deductions."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/finance/payouts">Go to payouts</Link>
          </Button>
        }
      />
      <FinanceSubnav />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatPill label="Landlords owed" value={due.length} tone={due.length ? "warning" : "success"} />
        <StatPill label="Net due" value={formatCurrency(dueTotal)} tone={dueTotal > 0 ? "warning" : "neutral"} />
        <StatPill label="Statements issued" value={statements.length} />
      </div>

      <div className="mt-6">
        <LandlordStatementActions />
      </div>

      <AdminSection title="Balances due" description="Positive = money still owed to the landlord">
        {due.length ? (
          <div className="overflow-hidden rounded-xl border bg-card">
            <ul className="divide-y">
              {due.map((b) => (
                <li key={b.landlordId} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium">{b.name}</span>
                  <span className="font-semibold">£{b.balance.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <AdminEmptyState title="Nothing outstanding" description="Landlord ledgers are settled." />
        )}
      </AdminSection>

      <AdminSection title="Issued statements">
        {statements.length ? (
          <div className="space-y-2">
            {statements.map(({ statement, firstName, lastName, document }) => (
              <div
                key={statement.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm"
              >
                <div>
                  <p className="font-semibold">
                    {firstName} {lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {statement.periodFrom} → {statement.periodTo} · Net £
                    {Number((statement.totals as { net?: number })?.net ?? 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={statement.status} />
                  {document?.url && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={document.url} target="_blank">
                        Download
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="No statements yet"
            description="Pick a date range above and generate statements from ledger activity."
          />
        )}
      </AdminSection>
    </div>
  );
}
