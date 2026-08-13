import Link from "next/link";
import { notFound } from "next/navigation";
import { getLandlordStatementForView } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import { StatementShareActions } from "@/components/admin/statement-share-actions";
import { FinanceSubnav } from "@/components/admin/finance-subnav";
import { AdminPageHeader, StatusBadge } from "@/components/admin/admin-page";
import { LandlordStatementView } from "@/components/finance/landlord-statement-view";
import { PrintButton } from "@/components/print-button";
import { statementDownloadPath } from "@/lib/pdf/landlord-statement";

export default async function AdminStatementPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const view = await getLandlordStatementForView(id);
  if (!view) notFound();

  const { statement, landlordName, totals } = view;

  return (
    <div>
      <div className="print:hidden">
        <Button asChild variant="ghost" size="sm" className="mb-2 px-2">
          <Link href="/admin/finance/statements">← Statements</Link>
        </Button>
        <AdminPageHeader
          title={landlordName}
          description={`Review this statement on the platform before downloading, emailing, or sending the portal link.`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={statement.status} />
              <PrintButton />
              <Button asChild variant="outline" size="sm">
                <a href={statementDownloadPath(statement.id)}>Download PDF</a>
              </Button>
              <StatementShareActions statementId={statement.id} />
            </div>
          }
        />
        <FinanceSubnav />
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
