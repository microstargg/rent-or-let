import Link from "next/link";
import { getDefaultBranch, listLandlordStatements } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import { LandlordStatementActions } from "@/components/admin/landlord-statement-actions";
import { FinanceSubnav } from "@/components/admin/finance-subnav";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminEmptyState, AdminPageHeader, AdminSection, StatusBadge } from "@/components/admin/admin-page";
import { formatMoney, formatDayRange } from "@/lib/utils";
import { groupStatementsWithProperties, statementAdminPath } from "@/lib/finance/statement-format";
import { statementDownloadPath, statementPropertyAddress } from "@/lib/pdf/landlord-statement";
import { StatementShareActions } from "@/components/admin/statement-share-actions";
import { displayPersonName } from "@/lib/person-name";

function monthLabel(day: string | Date) {
  const d = typeof day === "string" ? new Date(`${day.slice(0, 10)}T12:00:00Z`) : day;
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Europe/London" });
}

const netOf = (totals: unknown) => Number((totals as { net?: number } | null)?.net ?? 0);

export default async function LandlordStatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim().toLowerCase();
  const branch = await getDefaultBranch();
  const statements = branch ? await listLandlordStatements(branch.id) : [];
  const grouped = groupStatementsWithProperties(statements, (row) => statementPropertyAddress(row.statement) ?? "");

  const matching = grouped.filter(({ overall, properties }) => {
    if (!q) return true;
    const hay = [
      displayPersonName(overall.firstName ?? "", overall.lastName ?? ""),
      ...properties.map((p) => statementPropertyAddress(p.statement) ?? ""),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  // Group by the month the statement period ends in, newest first.
  const byMonth = new Map<string, typeof matching>();
  for (const g of matching) {
    const key = String(g.overall.statement.periodTo).slice(0, 7);
    const list = byMonth.get(key) ?? [];
    list.push(g);
    byMonth.set(key, list);
  }
  const months = [...byMonth.keys()].sort().reverse();

  return (
    <div>
      <AdminPageHeader
        title="Landlord statements"
        description="One statement per landlord for each period, with a statement per property when they have more than one. Open one to check it before you send it."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/finance/payouts">Go to payouts</Link>
          </Button>
        }
      />
      <FinanceSubnav />

      <details className="mt-6 rounded-xl border bg-card" open={grouped.length === 0}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Make statements for a period</summary>
        <div className="border-t p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Usually done on Month end. Finished jobs dated in the period show as repair costs.
          </p>
          <LandlordStatementActions />
        </div>
      </details>

      <AdminSection title="Statements">
        <AdminListToolbar searchPlaceholder="Search landlord or address" />
        {months.length ? (
          <div className="mt-3 space-y-6">
            {months.map((m) => {
              const list = byMonth.get(m)!;
              const total = list.reduce((s, g) => s + netOf(g.overall.statement.totals), 0);
              return (
                <section key={m}>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold">{monthLabel(`${m}-15`)}</h3>
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {list.length} {list.length === 1 ? "landlord" : "landlords"} · Net {formatMoney(total)}
                    </p>
                  </div>
                  <ul className="divide-y rounded-xl border bg-card">
                    {list.map(({ overall: { statement, firstName, lastName }, properties }) => (
                      <li key={statement.id} className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <Link href={statementAdminPath(statement.id)} className="font-medium hover:underline">
                              {displayPersonName(firstName ?? "", lastName ?? "")}
                            </Link>
                            <p className="text-sm text-muted-foreground">
                              {formatDayRange(statement.periodFrom, statement.periodTo)} · Net{" "}
                              <span className="tabular-nums">{formatMoney(netOf(statement.totals))}</span>
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={statement.status} />
                            <Button asChild variant="outline" size="sm">
                              <a href={statementDownloadPath(statement.id)}>PDF</a>
                            </Button>
                            <StatementShareActions statementId={statement.id} />
                          </div>
                        </div>
                        {properties.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                              {properties.length} property {properties.length === 1 ? "statement" : "statements"}
                            </summary>
                            <ul className="mt-1 divide-y border-l pl-3">
                              {properties.map(({ statement: ps }) => (
                                <li key={ps.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm">
                                  <Link href={statementAdminPath(ps.id)} className="hover:underline">
                                    {statementPropertyAddress(ps)}
                                  </Link>
                                  <span className="flex items-center gap-3">
                                    <span className="tabular-nums text-muted-foreground">
                                      Net {formatMoney(netOf(ps.totals))}
                                    </span>
                                    <a href={statementDownloadPath(ps.id)} className="text-primary hover:underline">
                                      PDF
                                    </a>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        ) : (
          <AdminEmptyState
            title={grouped.length ? "No statements match" : "No statements yet"}
            description={grouped.length ? "Try another name or address." : "They're made on Month end, or above."}
          />
        )}
      </AdminSection>
    </div>
  );
}
