import { listArrears, getDefaultBranch } from "@/lib/db/queries";
import { ApplyLateFeesButton } from "@/components/admin/apply-late-fees-button";
import { FinanceSubnav } from "@/components/admin/finance-subnav";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  AdminTable,
  StatPill,
} from "@/components/admin/admin-page";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default async function AdminArrearsPage() {
  const branch = await getDefaultBranch();
  const rows = branch ? await listArrears(branch.id) : [];
  const totalBalance = rows.reduce((sum, r) => sum + r.balance, 0);
  const severe = rows.filter((r) => r.daysOverdue >= 14).length;

  return (
    <div>
      <AdminPageHeader
        title="Arrears"
        description="Tenancies with a positive ledger balance. Focus on the oldest overdue first."
        actions={<ApplyLateFeesButton />}
      />
      <FinanceSubnav />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatPill label="In arrears" value={rows.length} tone={rows.length ? "warning" : "success"} />
        <StatPill
          label="Total owed"
          value={formatCurrency(totalBalance)}
          tone={totalBalance > 0 ? "danger" : "success"}
        />
        <StatPill
          label="14+ days overdue"
          value={severe}
          tone={severe ? "danger" : "neutral"}
          hint="Prioritise these for chase"
        />
      </div>

      <AdminSection
        title="Arrears board"
        description="Balance is the live tenancy ledger (charges minus payments)"
      >
        {rows.length ? (
          <AdminTable headers={["Property", "Renter", "Balance", "Days overdue", "Oldest due"]}>
            {rows.map((r) => (
              <tr key={r.tenancyId}>
                <td className="px-4 py-3 font-medium">{r.propertyAddress}</td>
                <td className="px-4 py-3">{r.renterName}</td>
                <td className="px-4 py-3 font-semibold text-red-700">
                  £{r.balance.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      r.daysOverdue >= 14
                        ? "font-medium text-red-700"
                        : r.daysOverdue >= 7
                          ? "font-medium text-amber-700"
                          : ""
                    }
                  >
                    {r.daysOverdue}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.oldestDue ?? "—"}</td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <AdminEmptyState
            title="No arrears"
            description="All tenancy balances are clear. Check Exceptions if payments look wrong."
          />
        )}
        <p className="mt-3 text-sm text-muted-foreground">
          Partial or overpayments land in{" "}
          <Link href="/admin/finance/exceptions" className="text-primary underline">
            Exceptions
          </Link>
          .
        </p>
      </AdminSection>
    </div>
  );
}
