import { NextResponse } from "next/server";
import { getLandlordStatementForDownload } from "@/lib/db/queries";
import {
  authorizeStatementDownload,
  landlordStatementPdfResponse,
} from "@/lib/pdf/statement-download";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing statement id" }, { status: 400 });
  }

  const row = await getLandlordStatementForDownload(id);
  if (!row) {
    return NextResponse.json({ error: "Statement not found" }, { status: 404 });
  }

  const auth = await authorizeStatementDownload({ landlordId: row.statement.landlordId });
  if (!auth.ok) return auth.response;

  return landlordStatementPdfResponse(row);
}
