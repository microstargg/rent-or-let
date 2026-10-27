import Link from "next/link";
import { requireLandlordSession } from "@/lib/auth/server";
import { listLandlordStatements } from "@/lib/db/queries";
import {
  groupStatementsWithProperties,
  statementPortalPath,
} from "@/lib/finance/statement-format";
import { statementDownloadPath, statementPropertyAddress } from "@/lib/pdf/landlord-statement";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { formatMoney } from "@/lib/portal-format";

function statementNet(totals: unknown) {
  return formatMoney((totals as { net?: number } | null)?.net ?? 0);
}

export default async function LandlordPortalStatements() {
  const ctx = await requireLandlordSession();
  if (!ctx) return null;

  const all = await listLandlordStatements(ctx.profile.profile.branchId);
  const mine = groupStatementsWithProperties(
    all.filter((s) => s.statement.landlordId === ctx.profile.profile.landlordId),
    (row) => statementPropertyAddress(row.statement) ?? ""
  );

  return (
    <div>
      <AdminPageHeader
        title="Statements"
        description="Monthly statements of rent collected, fees and money paid to you"
      />
      <div className="mt-8 space-y-4">
        {mine.map(({ overall: { statement }, properties }) => (
          <div key={statement.id} className="rounded-xl border bg-card p-4">
            <p className="font-semibold">
              {formatDate(statement.periodFrom)} to {formatDate(statement.periodTo)}
            </p>
            <p className="text-sm text-muted-foreground">
              Net to you {statementNet(statement.totals)}
              {statement.issuedAt ? ` · issued ${formatDate(statement.issuedAt)}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={statementPortalPath(statement.id)}>View statement</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={statementDownloadPath(statement.id)}>Download PDF</a>
              </Button>
            </div>
            {properties.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <p className="text-sm font-medium">Individual property statements</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {properties.map(({ statement: ps }) => (
                    <li key={ps.id} className="flex flex-wrap items-center justify-between gap-3">
                      <span>
                        {statementPropertyAddress(ps)}
                        <span className="text-muted-foreground">
                          {" "}
                          · Net {statementNet(ps.totals)}
                        </span>
                      </span>
                      <span className="flex gap-4">
                        <Link href={statementPortalPath(ps.id)} className="text-primary underline">
                          View
                        </Link>
                        <a href={statementDownloadPath(ps.id)} className="text-primary underline">
                          Download PDF
                        </a>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {!mine.length && (
          <AdminEmptyState
            title="No statements yet"
            description="Your first statement will appear here after your agent's next statement run."
          />
        )}
      </div>
    </div>
  );
}
