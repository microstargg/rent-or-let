import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLandlordSession } from "@/lib/auth/server";
import { getLandlordStatementForView } from "@/lib/db/queries";
import { LandlordStatementView } from "@/components/finance/landlord-statement-view";
import { PrintButton } from "@/components/print-button";
import { statementDownloadPath } from "@/lib/pdf/landlord-statement";

export default async function LandlordPortalStatementDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireLandlordSession();
  if (!ctx) return null;

  const { id } = await params;
  const view = await getLandlordStatementForView(id);
  if (!view || view.statement.landlordId !== ctx.profile.profile.landlordId) {
    notFound();
  }

  const { statement, landlordName, totals } = view;

  return (
    <div>
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/landlord-portal/statements"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Statements
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Statement</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {statement.periodFrom} to {statement.periodTo}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton />
          <a
            href={statementDownloadPath(statement.id)}
            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            Download PDF
          </a>
        </div>
      </div>

      <div className="mt-8 print:mt-0">
        <LandlordStatementView
          landlordName={landlordName}
          periodFrom={statement.periodFrom}
          periodTo={statement.periodTo}
          totals={totals}
          issuedAt={statement.issuedAt}
        />
      </div>
    </div>
  );
}
