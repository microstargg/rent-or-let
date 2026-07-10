import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api-auth";
import { getDefaultBranch } from "@/lib/db/queries";
import { generateRentInvoicesForBranch } from "@/lib/operations/rent/generate-invoices";

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branch = await getDefaultBranch();
  if (!branch) {
    return NextResponse.json({ error: "No branch configured" }, { status: 400 });
  }

  const periodStart = new Date();
  periodStart.setDate(1);
  const periodStartStr = periodStart.toISOString().slice(0, 10);

  const result = await generateRentInvoicesForBranch(branch.id, periodStartStr);
  return NextResponse.json({ ok: true, ...result });
}
