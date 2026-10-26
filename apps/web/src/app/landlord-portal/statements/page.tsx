import Link from "next/link";
import { requireLandlordSession } from "@/lib/auth/server";
import { listLandlordStatements } from "@/lib/db/queries";
import {
  groupStatementsWithProperties,
  statementPortalPath,
} from "@/lib/finance/statement-format";
import { statementDownloadPath, statementPropertyAddress } from "@/lib/pdf/landlord-statement";

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
      <h1 className="text-3xl font-bold">Statements</h1>
      <div className="mt-8 space-y-3">
        {mine.map(({ overall: { statement }, properties }) => (
          <div key={statement.id} className="rounded-xl border p-4">
            <p className="font-semibold">
              {statement.periodFrom} to {statement.periodTo}
            </p>
            <p className="text-sm text-muted-foreground">
              Net £{Number((statement.totals as { net?: number })?.net ?? 0).toFixed(2)}
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <Link
                href={statementPortalPath(statement.id)}
                className="font-medium text-primary underline"
              >
                View statement
              </Link>
              <a href={statementDownloadPath(statement.id)} className="text-primary underline">
                Download PDF
              </a>
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
                          · Net £{Number((ps.totals as { net?: number })?.net ?? 0).toFixed(2)}
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
        {!mine.length && <p className="text-muted-foreground">No statements yet</p>}
      </div>
    </div>
  );
}
