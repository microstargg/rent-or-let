import { NextResponse } from "next/server";
import { requireLandlordSession } from "@/lib/auth/server";
import { csvResponse, landlordTaxSummaryCsv } from "@/lib/finance/tax-summary-csv";
import { taxYearOf } from "@/lib/finance/tax";

export async function GET(request: Request) {
  const session = await requireLandlordSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const year = Number(new URL(request.url).searchParams.get("year")) || taxYearOf(new Date()) - 1;
  const { csv, filename } = await landlordTaxSummaryCsv(session.profile.profile.landlordId, year);
  return csvResponse(csv, filename);
}
