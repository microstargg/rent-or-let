import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { getDefaultBranch } from "@/lib/db/queries";
import {
  importStatementCsvForBranch,
  importStatementRowsForBranch,
} from "@/lib/bank-feed/csv-import";
import { parseStatementPdf } from "@/lib/bank-feed/pdf-import";

// Reading a long PDF statement with the AI model can take a while.
export const maxDuration = 120;

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  try {
    if (isPdf(file)) {
      const { rows, statementMoneyIn } = await parseStatementPdf(
        new Uint8Array(await file.arrayBuffer()),
        file.name
      );
      if (rows.length === 0) {
        return NextResponse.json(
          { error: "No transactions were found in that PDF. Check it is a bank statement." },
          { status: 400 }
        );
      }
      const result = await importStatementRowsForBranch(branch.id, rows, { source: "pdf" });
      return NextResponse.json({ ok: true, source: "pdf", statementMoneyIn, ...result });
    }
    const result = await importStatementCsvForBranch(branch.id, await file.text());
    return NextResponse.json({ ok: true, source: "csv", ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
