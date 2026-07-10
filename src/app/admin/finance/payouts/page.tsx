import {
  getDefaultBranch,
  listLandlordBalances,
  listLandlordPayouts,
  listLandlords,
} from "@/lib/db/queries";
import { LandlordPayoutButton } from "@/components/admin/landlord-payout-button";
import { LandlordAdjustmentForm } from "@/components/admin/landlord-adjustment-form";
import { FinanceSubnav } from "@/components/admin/finance-subnav";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  StatPill,
} from "@/components/admin/admin-page";
import { formatCurrency, formatDate } from "@/lib/utils";
import { displayPersonName } from "@/lib/person-name";

export default async function AdminPayoutsPage() {
  const branch = await getDefaultBranch();
  const balances = branch ? await listLandlordBalances(branch.id) : [];
  const payouts = branch ? await listLandlordPayouts(branch.id) : [];
  const landlords = await listLandlords(branch?.id);
  const due = balances.filter((b) => b.balance > 0.001);
  const dueTotal = due.reduce((sum, b) => sum + b.balance, 0);

  return (
    <div>
      <AdminPageHeader
        title="Landlord payouts"
        description="Pay net balances after fees and maintenance costs. Adjustments post straight to the landlord ledger."
      />
      <FinanceSubnav />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatPill label="Ready to pay" value={due.length} tone={due.length ? "warning" : "success"} />
        <StatPill label="Payout total" value={formatCurrency(dueTotal)} />
        <StatPill label="Payouts recorded" value={payouts.length} />
      </div>

      <AdminSection
        title="Due for payout"
        description="Mark paid when the bank transfer has left the client account"
      >
        {due.length ? (
          <div className="space-y-2">
            {due.map((b) => (
              <div
                key={b.landlordId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm"
              >
                <div>
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-sm text-muted-foreground">£{b.balance.toFixed(2)} due</p>
                </div>
                <LandlordPayoutButton landlordId={b.landlordId} />
              </div>
            ))}
          </div>
        ) : (
          <AdminEmptyState title="Nothing due" description="No positive landlord balances to pay out." />
        )}
      </AdminSection>

      <AdminSection
        title="Manual adjustment"
        description="Use for one-off credits or debits that aren’t rent or maintenance"
      >
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <LandlordAdjustmentForm
            landlords={landlords.map((l) => ({
              id: l.id,
              name: displayPersonName(l.firstName, l.lastName),
            }))}
          />
        </div>
      </AdminSection>

      <AdminSection title="Recent payouts">
        {payouts.length ? (
          <div className="overflow-hidden rounded-xl border bg-card">
            <ul className="divide-y text-sm">
              {payouts.map(({ payout, firstName, lastName }) => (
                <li key={payout.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span>
                    {firstName} {lastName}
                  </span>
                  <span className="text-muted-foreground">
                    £{Number(payout.amount).toFixed(2)} · {payout.method} ·{" "}
                    {formatDate(payout.paidAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <AdminEmptyState title="No payouts yet" />
        )}
      </AdminSection>
    </div>
  );
}
