import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { getDefaultBranch } from "@/lib/db/queries";
import { listPayoutsDue } from "@/lib/finance/payout-run";
import { toCsv } from "@/lib/finance/tax";

/** CSV of payouts due, for uploading to the bank as a bulk payment. Landlords with no bank details are left out. */
export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch configured" }, { status: 400 });

  const due = (await listPayoutsDue(branch.id)).filter((p) => p.bank);
  const csv = toCsv([
    ["Payee name", "Sort code", "Account number", "Amount", "Reference"],
    ...due.map((p) => [
      p.bank!.accountName || p.name,
      p.bank!.sortCode.replace(/\D/g, ""),
      p.bank!.accountNumber,
      p.amount.toFixed(2),
      p.reference,
    ]),
  ]);
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="landlord-payouts-${day}.csv"`,
    },
  });
}
