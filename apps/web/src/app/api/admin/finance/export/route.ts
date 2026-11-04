import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { listLandlordLedgerBetween } from "@/lib/db/queries/landlord-finance";
import { csvResponse } from "@/lib/finance/tax-summary-csv";
import { toCsv } from "@/lib/finance/tax";
import { displayPersonName } from "@/lib/person-name";

const ACCOUNT: Record<string, string> = {
  rent_received: "Rent received (client)",
  management_fee: "Management fees (income)",
  letting_fee: "Letting fees (income)",
  work_order_cost: "Contractor costs (client)",
  payout: "Landlord payouts (client)",
  nrl_tax: "NRL tax due to HMRC",
  adjustment: "Adjustments (client)",
};

/**
 * Landlord ledger lines between two dates as CSV for Xero, QuickBooks or a spreadsheet.
 * Fees are split into net and VAT, so the agency's fee income and VAT can be posted.
 */
export async function GET(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    return NextResponse.json({ error: "Give from and to dates (YYYY-MM-DD)" }, { status: 400 });
  }
  const rows = await listLandlordLedgerBetween({ from, to });
  const out: unknown[][] = [
    ["Date", "Contact", "Property", "Account", "Description", "Reference", "Net", "VAT", "Gross"],
  ];
  for (const r of rows) {
    const gross = Number(r.entry.amount);
    const meta = (r.entry.meta ?? {}) as { net?: number; vat?: number };
    const isFee = r.entry.entryType === "management_fee" || r.entry.entryType === "letting_fee";
    // Fees are debits to the landlord and income to the agency, so they're shown positive.
    const sign = isFee ? -1 : 1;
    const vat = isFee && typeof meta.vat === "number" ? meta.vat : 0;
    const net = isFee && typeof meta.net === "number" ? meta.net : sign * gross - vat;
    out.push([
      r.entry.occurredAt.toISOString().slice(0, 10),
      displayPersonName(r.landlordFirstName, r.landlordLastName),
      r.propertyAddress ?? "",
      ACCOUNT[r.entry.entryType] ?? r.entry.entryType,
      r.entry.memo ?? "",
      r.entry.id,
      net.toFixed(2),
      vat.toFixed(2),
      (sign * gross).toFixed(2),
    ]);
  }
  return csvResponse(toCsv(out), `letflow-ledger-${from}-to-${to}.csv`);
}
