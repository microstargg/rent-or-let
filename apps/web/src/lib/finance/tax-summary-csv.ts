import { listLandlordLedgerBetween } from "@/lib/db/queries/landlord-finance";
import { summariseForTax, taxCategory, taxYearRange, toCsv } from "./tax";

/** A landlord's income and expenses for one tax year, overall and per property, as CSV. */
export async function landlordTaxSummaryCsv(landlordId: string, startYear: number) {
  const range = taxYearRange(startYear);
  const rows = await listLandlordLedgerBetween({ from: range.from, to: range.to, landlordId });
  const byProperty = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.propertyAddress ?? "Not linked to a property";
    byProperty.set(key, [...(byProperty.get(key) ?? []), r]);
  }
  const out: unknown[][] = [
    [`Rental income and expenses, tax year ${range.label} (${range.from} to ${range.to})`],
    [],
    ["Property", "Rent received", "Agent fees", "Repairs and maintenance", "Other costs", "Profit", "NRL tax withheld"],
  ];
  for (const [address, list] of byProperty) {
    const t = summariseForTax(list.map((r) => r.entry));
    if (!t.rent && !t.agentFees && !t.repairs && !t.other && !t.taxWithheld) continue;
    out.push([address, t.rent, t.agentFees, t.repairs, t.other, t.profit, t.taxWithheld]);
  }
  const all = summariseForTax(rows.map((r) => r.entry));
  out.push(["Total", all.rent, all.agentFees, all.repairs, all.other, all.profit, all.taxWithheld]);
  out.push([]);
  out.push(["Date", "Property", "Type", "Description", "Amount", "Tax category"]);
  for (const r of rows) {
    out.push([
      r.entry.occurredAt.toISOString().slice(0, 10),
      r.propertyAddress ?? "",
      r.entry.entryType,
      r.entry.memo ?? "",
      Number(r.entry.amount).toFixed(2),
      taxCategory(r.entry.entryType),
    ]);
  }
  out.push([]);
  out.push(["Agent fees include VAT where charged. This summary is to help with a tax return; it is not tax advice."]);
  return { csv: toCsv(out), filename: `income-and-expenses-${range.label.replace("/", "-")}.csv` };
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
