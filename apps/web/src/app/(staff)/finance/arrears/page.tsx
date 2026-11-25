import Link from "next/link";
import { listArrears, getDefaultBranch } from "@/lib/db/queries";
import { listTenantCredits, listTenanciesWithoutOpeningBalance } from "@/lib/db/queries/tenant-credit";
import { ApplyLateFeesButton } from "@/components/admin/apply-late-fees-button";
import { FinanceSubnav } from "@/components/admin/finance-subnav";
import { OpeningBalancesTable } from "@/components/admin/opening-balances-table";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  AdminTable,
  StatPill,
} from "@/components/admin/admin-page";
import { cn, formatCurrency } from "@/lib/utils";

const TABS = [
  { key: "owing", label: "Owing" },
  { key: "credit", label: "In credit" },
  { key: "opening", label: "Opening balances" },
] as const;
type Tab = (typeof TABS)[number]["key"];

function ukDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB");
}

export default async function BalancesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === rawTab) ? (rawTab as Tab) : "owing";
  const branch = await getDefaultBranch();
  const [rows, credits, openingCandidates] = branch
    ? await Promise.all([
        listArrears(branch.id),
        listTenantCredits(branch.id),
        tab === "opening" ? listTenanciesWithoutOpeningBalance(branch.id) : Promise.resolve([]),
      ])
    : [[], [], []];
  const totalBalance = rows.reduce((sum, r) => sum + r.balance, 0);
  const totalCredit = credits.reduce((sum, r) => sum + r.credit, 0);
  const severe = rows.filter((r) => r.daysOverdue >= 14).length;
  const endedWithCredit = credits.filter((c) => c.status === "ended").length;

  return (
    <div>
      <AdminPageHeader
        title="Balances"
        description="Tenants who owe rent, and tenants in credit from overpaying or paying ahead. Credit is client money held for the tenant."
        actions={<ApplyLateFeesButton />}
      />
      <FinanceSubnav />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatPill label="In arrears" value={rows.length} tone={rows.length ? "warning" : "success"} />
        <StatPill
          label="Total owed"
          value={formatCurrency(totalBalance)}
          tone={totalBalance > 0 ? "danger" : "success"}
          hint={severe ? `${severe} at 14+ days overdue` : undefined}
        />
        <StatPill label="In credit" value={credits.length} tone={credits.length ? "info" : "neutral"} />
        <StatPill
          label="Credit held for tenants"
          value={formatCurrency(totalCredit)}
          tone={totalCredit > 0 ? "info" : "neutral"}
          hint={endedWithCredit ? `${endedWithCredit} ended tenancies to refund` : "Used on the next rent due date"}
        />
      </div>

      <nav className="mt-6 flex gap-1 border-b" aria-label="Balances">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "owing" ? "/finance/arrears" : `/finance/arrears?tab=${t.key}`}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              tab === t.key
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {t.key === "owing" && rows.length > 0 && <span className="ml-1.5 text-xs">({rows.length})</span>}
            {t.key === "credit" && credits.length > 0 && <span className="ml-1.5 text-xs">({credits.length})</span>}
          </Link>
        ))}
      </nav>

      {tab === "owing" && (
        <AdminSection
          title="Arrears"
          description="Balance is rent and fees due to date minus payments received. Rent raised for a future due date is not counted until that date. Focus on the oldest overdue first."
        >
          {rows.length ? (
            <AdminTable headers={["Property", "Renter", "Balance", "Days overdue", "Oldest due", "Plan"]}>
              {rows.map((r) => (
                <tr key={r.tenancyId}>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/tenancies/${r.tenancyId}`} className="text-primary hover:underline">
                      {r.propertyAddress}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{r.renterName}</td>
                  <td className="px-4 py-3 font-semibold text-red-700">£{r.balance.toFixed(2)}</td>
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
                  <td className="px-4 py-3 text-sm">
                    {r.plan ? (
                      <span className={r.plan.onTrack ? "text-emerald-700" : "text-red-700"}>
                        £{r.plan.instalment.toFixed(0)}/month, {r.plan.onTrack ? "on track" : "behind"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <AdminEmptyState
              title="No arrears"
              description="All tenancy balances are clear. Check Exceptions for bank receipts that couldn't be matched."
            />
          )}
        </AdminSection>
      )}

      {tab === "credit" && (
        <AdminSection
          title="Tenants in credit"
          description="Money paid that hasn't gone against any rent yet: overpayments, rent paid ahead and opening credit. It's used automatically on the next due date. Refund it from the tenancy page."
        >
          {credits.length ? (
            <AdminTable headers={["Property", "Renter", "Credit", "Covers", "Next rent due", "Tenancy"]}>
              {credits.map((c) => (
                <tr key={c.tenancyId}>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/tenancies/${c.tenancyId}`} className="text-primary hover:underline">
                      {c.propertyAddress}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.renterName}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">£{c.credit.toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.rentAmount > 0 ? `${(c.credit / c.rentAmount).toFixed(1)} months` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{ukDate(c.nextDue)}</td>
                  <td className="px-4 py-3 text-sm">
                    {c.status === "ended" ? (
                      <span className="font-medium text-amber-700">Ended {ukDate(c.endDate)}: refund due</span>
                    ) : (
                      <span className="capitalize text-muted-foreground">{c.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <AdminEmptyState
              title="Nobody in credit"
              description="When a tenant pays more than is due, the extra shows here instead of getting lost."
            />
          )}
        </AdminSection>
      )}

      {tab === "opening" && (
        <AdminSection
          title="Opening balances"
          description="Taking on tenancies from another agent or system? Enter what each tenant owed or had in credit on the handover date. Arrears are added as an opening charge; credit is held and used on the next rent due dates. Tenancies that already have one are set on their own page."
        >
          {openingCandidates.length ? (
            <OpeningBalancesTable rows={openingCandidates} />
          ) : (
            <AdminEmptyState
              title="Nothing to set"
              description="Every active tenancy already has an opening balance. Change one from its tenancy page."
            />
          )}
        </AdminSection>
      )}
    </div>
  );
}
