import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { getLandlordById } from "@/lib/db/queries";
import { csvResponse, landlordTaxSummaryCsv } from "@/lib/finance/tax-summary-csv";
import { taxYearOf } from "@/lib/finance/tax";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const landlord = await getLandlordById(id);
  if (!landlord) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const year = Number(new URL(request.url).searchParams.get("year")) || taxYearOf(new Date()) - 1;
  const { csv, filename } = await landlordTaxSummaryCsv(id, year);
  return csvResponse(csv, `${landlord.lastName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${filename}`);
}
