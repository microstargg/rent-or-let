import { NextResponse } from "next/server";
import { requireStaffSession, requireLandlordSession } from "@/lib/auth/server";
import { statementTotalsForDownload } from "@/lib/db/queries/landlord-finance";
import {
  contentDispositionAttachment,
  renderLandlordStatementPdf,
  statementDownloadFilename,
} from "@/lib/pdf/landlord-statement";

interface StatementDownloadRow {
  statement: {
    id?: string;
    branchId: string;
    landlordId: string;
    periodFrom: string;
    periodTo: string;
    totals: unknown;
    issuedAt: Date | string | null;
  };
  firstName: string;
  lastName: string;
}

export async function authorizeStatementDownload(row: {
  landlordId: string;
}): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const staff = await requireStaffSession();
  if (staff) return { ok: true };

  const landlord = await requireLandlordSession();
  if (landlord?.profile.profile.landlordId === row.landlordId) return { ok: true };

  return {
    ok: false,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}

export async function landlordStatementPdfResponse(
  row: StatementDownloadRow
): Promise<NextResponse> {
  const landlordName = `${row.firstName} ${row.lastName}`.trim();
  const totals = await statementTotalsForDownload(row.statement);
  const pdf = renderLandlordStatementPdf({
    landlordName,
    periodFrom: row.statement.periodFrom,
    periodTo: row.statement.periodTo,
    totals,
    issuedAt: row.statement.issuedAt,
  });
  const filename = statementDownloadFilename(
    landlordName,
    row.statement.periodFrom,
    row.statement.periodTo
  );
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDispositionAttachment(filename),
      "Cache-Control": "private, no-store",
    },
  });
}
