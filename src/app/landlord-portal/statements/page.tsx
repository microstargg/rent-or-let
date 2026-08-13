import { requireLandlordSession } from "@/lib/auth/server";
import { listLandlordStatements } from "@/lib/db/queries";
import { statementDownloadPath } from "@/lib/pdf/landlord-statement";

export default async function LandlordPortalStatements() {
  const ctx = await requireLandlordSession();
  if (!ctx) return null;

  const all = await listLandlordStatements(ctx.profile.profile.branchId);
  const mine = all.filter((s) => s.statement.landlordId === ctx.profile.profile.landlordId);

  return (
    <div>
      <h1 className="text-3xl font-bold">Statements</h1>
      <div className="mt-8 space-y-3">
        {mine.map(({ statement }) => (
          <div key={statement.id} className="rounded-xl border p-4">
            <p className="font-semibold">
              {statement.periodFrom} to {statement.periodTo}
            </p>
            <p className="text-sm text-muted-foreground">
              Net £{Number((statement.totals as { net?: number })?.net ?? 0).toFixed(2)}
            </p>
            <a
              href={statementDownloadPath(statement.id)}
              className="text-sm text-primary underline"
            >
              Download PDF
            </a>
          </div>
        ))}
        {!mine.length && <p className="text-muted-foreground">No statements yet</p>}
      </div>
    </div>
  );
}
