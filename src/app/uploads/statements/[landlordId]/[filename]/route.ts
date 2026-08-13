import { NextResponse } from "next/server";
import { findLandlordStatementByUpload } from "@/lib/db/queries";
import {
  authorizeStatementDownload,
  landlordStatementPdfResponse,
} from "@/lib/pdf/statement-download";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ landlordId: string; filename: string }> }
) {
  const { landlordId, filename } = await params;
  if (!landlordId || !filename) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = await findLandlordStatementByUpload(landlordId, filename);
  if (!row) {
    return NextResponse.json({ error: "Statement not found" }, { status: 404 });
  }

  const auth = await authorizeStatementDownload({ landlordId: row.statement.landlordId });
  if (!auth.ok) return auth.response;

  return landlordStatementPdfResponse(row);
}
