import { NextResponse } from "next/server";
import { requireStaffSession, requireLandlordSession } from "@/lib/auth/server";
import {
  contentDispositionAttachment,
  renderLandlordStatementPdf,
  statementDownloadFilename,
  type LandlordStatementTotals,
} from "@/lib/pdf/landlord-statement";

interface StatementDownloadRow {
  statement: {
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

export function landlordStatementPdfResponse(row: StatementDownloadRow): NextResponse {
  const landlordName = `${row.firstName} ${row.lastName}`.trim();
  const pdf = renderLandlordStatementPdf({
    landlordName,
    periodFrom: row.statement.periodFrom,
    periodTo: row.statement.periodTo,
    totals: (row.statement.totals ?? {}) as LandlordStatementTotals,
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

