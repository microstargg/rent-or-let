import Link from "next/link";
import { getDefaultBranch, listLandlordPayouts, listLandlords } from "@/lib/db/queries";
import { LandlordPayoutButton } from "@/components/admin/landlord-payout-button";
import { LandlordAdjustmentForm } from "@/components/admin/landlord-adjustment-form";
import { FinanceSubnav } from "@/components/admin/finance-subnav";
import { CopyTextButton } from "@/components/admin/copy-text-button";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  AdminTable,
  StatGrid,
  StatPill,
} from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { formatDay, formatMoney, humanize } from "@/lib/utils";
import { displayPersonName } from "@/lib/person-name";
import { listPayoutsDue } from "@/lib/finance/payout-run";

export default async function AdminPayoutsPage() {
  const branch = await getDefaultBranch();
  const [due, payouts, landlords] = branch
    ? await Promise.all([listPayoutsDue(branch.id), listLandlordPayouts(branch.id), listLandlords(branch.id)])
    : [[], [], []];
  const dueTotal = due.reduce((sum, b) => sum + b.amount, 0);
  const noBank = due.filter((d) => !d.bank).length;
  const withBank = due.length - noBank;

  return (
    <div>
      <AdminPageHeader
        title="Landlord payouts"
        description="Pay what each landlord is owed after fees and repairs. Mark paid once the transfer has left the client account."
        actions={
          withBank > 0 ? (
            <Button asChild size="sm" variant="outline">
              <a href="/api/admin/finance/payouts/file" download>
                Download payment file
              </a>
            </Button>
          ) : undefined
        }
      />
      <FinanceSubnav />

      <StatGrid columns={3}>
        <StatPill label="Ready to pay" value={due.length} tone={due.length ? "warning" : "success"} />
        <StatPill label="Total to pay" value={formatMoney(dueTotal)} />
        <StatPill
          label="No bank details"
          value={noBank}
          tone={noBank ? "danger" : "neutral"}
          hint={noBank ? "Add them on the landlord" : undefined}
        />
      </StatGrid>

      <AdminSection
        title="To pay"
        description={
          withBank
            ? "Copy each line into your bank, or upload the payment file as a bulk payment. Landlords with no bank details are left out of the file."
            : undefined
        }
      >
        {due.length ? (
          <AdminTable headers={["Landlord", "Amount", "Pay to", "Reference", ""]}>
            {due.map((p) => (
              <tr key={p.landlordId} className="row-link align-top">
                <td className="px-4 py-3">
                  <Link href={`/landlords/${p.landlordId}`} className="row-link-main">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-semibold tabular-nums">
                  <CopyTextButton value={p.amount.toFixed(2)} className="font-semibold text-foreground" />
                </td>
                <td className="px-4 py-3">
                  {p.bank ? (
                    <div className="space-y-0.5 font-mono text-xs">
                      {p.bank.accountName && <CopyTextButton value={p.bank.accountName} />}
                      <div className="flex flex-wrap gap-x-3">
                        <CopyTextButton value={p.bank.sortCode} />
                        <CopyTextButton value={p.bank.accountNumber} />
                      </div>
                    </div>
                  ) : (
                    <Link href={`/landlords/${p.landlordId}`} className="text-sm text-red-700 hover:underline">
                      Add bank details
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  <CopyTextButton value={p.reference} />
                </td>
                <td className="px-4 py-3 text-right">
                  <LandlordPayoutButton landlordId={p.landlordId} />
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <AdminEmptyState title="Nothing to pay" description="No landlord is owed money right now." />
        )}
      </AdminSection>

      <AdminSection title="Paid">
        {payouts.length ? (
          <AdminTable headers={["Date", "Landlord", "How", "Amount"]}>
            {payouts.slice(0, 50).map(({ payout, firstName, lastName }) => (
              <tr key={payout.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{formatDay(payout.paidAt)}</td>
                <td className="px-4 py-2.5">{displayPersonName(firstName, lastName)}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{humanize(payout.method)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(Number(payout.amount))}</td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <AdminEmptyState title="No payouts yet" />
        )}
      </AdminSection>

      <details className="mt-6 rounded-xl border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Add a one-off credit or charge</summary>
        <div className="border-t p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            For anything that isn&apos;t rent or a repair. It goes straight onto the landlord&apos;s account.
          </p>
          <LandlordAdjustmentForm
            landlords={landlords.map((l) => ({ id: l.id, name: displayPersonName(l.firstName, l.lastName) }))}
          />
        </div>
      </details>
    </div>
  );
}
