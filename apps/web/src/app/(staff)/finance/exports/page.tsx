import { getDefaultBranch, listLandlords } from "@/lib/db/queries";
import { listNrlWithholdLandlords } from "@/lib/db/queries/landlord-finance";
import { FinanceSubnav } from "@/components/admin/finance-subnav";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { TaxExportsPanel } from "@/components/admin/tax-exports-panel";
import { nrlTaxDue, previousNrlQuarter, summariseForTax, taxYearOf, taxYearRange } from "@/lib/finance/tax";
import { displayPersonName } from "@/lib/person-name";

export default async function FinanceExportsPage() {
  const branch = await getDefaultBranch();
  const quarter = previousNrlQuarter(new Date());
  const [landlordRows, nrlRows] = branch
    ? await Promise.all([listLandlords(branch.id), listNrlWithholdLandlords(branch.id, quarter)])
    : [[], []];
  const thisTaxYear = taxYearOf(new Date());
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  const lastMonthEnd = new Date(monthStart.getTime() - 86400000);
  const lastMonthStart = new Date(Date.UTC(lastMonthEnd.getUTCFullYear(), lastMonthEnd.getUTCMonth(), 1));

  return (
    <div>
      <AdminPageHeader
        title="Exports"
        description="Tax summaries for landlords, the non-resident landlord return, and spreadsheets for your accountant."
      />
      <FinanceSubnav />
      <div className="mt-6">
        <TaxExportsPanel
          landlords={landlordRows.map((l) => ({ id: l.id, name: displayPersonName(l.firstName, l.lastName) }))}
          taxYears={[thisTaxYear - 1, thisTaxYear, thisTaxYear - 2].map((y) => ({ value: y, label: taxYearRange(y).label }))}
          defaultFrom={lastMonthStart.toISOString().slice(0, 10)}
          defaultTo={lastMonthEnd.toISOString().slice(0, 10)}
          nrlQuarterLabel={quarter.label}
          nrl={nrlRows.map(({ landlord, lines }) => {
            const t = summariseForTax(lines);
            return {
              landlordId: landlord.id,
              name: displayPersonName(landlord.firstName, landlord.lastName),
              approvalRef: landlord.nrlApprovalRef,
              profit: t.profit,
              withheld: t.taxWithheld,
              due: nrlTaxDue(t),
            };
          })}
        />
      </div>
    </div>
  );
}
