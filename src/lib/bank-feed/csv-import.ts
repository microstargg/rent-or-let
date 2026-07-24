import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bankConnections } from "@/lib/db/schema";
import { insertBankTransaction } from "@/lib/db/queries/bank-feed";
import { matchPendingBankTransactions } from "@/lib/bank-feed/sync";
import { csvProviderTxnId } from "@/lib/payment-ref";

export async function ensureCsvBankConnection(branchId: string) {
  const [existing] = await db
    .select()
    .from(bankConnections)
    .where(and(eq(bankConnections.branchId, branchId), eq(bankConnections.provider, "csv")))
    .limit(1);
  if (existing) {
    if (existing.status !== "active") {
      const [updated] = await db
        .update(bankConnections)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(bankConnections.id, existing.id))
        .returning();
      return updated ?? existing;
    }
    return existing;
  }

  const [created] = await db
    .insert(bankConnections)
    .values({
      branchId,
      provider: "csv",
      status: "active",
      accountName: "CSV statement import",
      meta: { source: "csv_import" },
    })
    .returning();
  return created;
}

export interface CsvStatementRow {
  date: string;
  description: string;
  amount: number;
}

/** Parse UK-friendly CSV with Date, Description, Amount headers (positive = credit). */
export function parseStatementCsv(text: string): CsvStatementRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headerCells = splitCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const dateIdx = headerCells.findIndex((h) => h === "date" || h === "booking date" || h === "booked");
  const descIdx = headerCells.findIndex(
    (h) => h === "description" || h === "narrative" || h === "details" || h === "reference"
  );
  const amountIdx = headerCells.findIndex((h) => h === "amount" || h === "value" || h === "credit");

  if (dateIdx < 0 || descIdx < 0 || amountIdx < 0) {
    throw new Error("CSV must include Date, Description, and Amount columns");
  }

  const rows: CsvStatementRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    const dateRaw = (cells[dateIdx] ?? "").trim();
    const description = (cells[descIdx] ?? "").trim();
    const amountRaw = (cells[amountIdx] ?? "").trim().replace(/£/g, "").replace(/,/g, "");
    const amount = Number(amountRaw);
    if (!dateRaw || !Number.isFinite(amount) || amount <= 0) continue;
    const date = normalizeCsvDate(dateRaw);
    if (!date) continue;
    rows.push({ date, description, amount });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function normalizeCsvDate(raw: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    const dd = m[1]!.padStart(2, "0");
    const mm = m[2]!.padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

export async function importStatementCsvForBranch(
  branchId: string,
  csvText: string
): Promise<{
  credits: number;
  imported: number;
  duplicates: number;
  matched: number;
  exceptions: number;
}> {
  const connection = await ensureCsvBankConnection(branchId);
  const rows = parseStatementCsv(csvText);

  let imported = 0;
  let duplicates = 0;

  for (const row of rows) {
    const providerTxnId = csvProviderTxnId(row.date, row.amount, row.description);
    const bookedAt = new Date(`${row.date}T12:00:00.000Z`);
    const { created } = await insertBankTransaction({
      branchId,
      connectionId: connection.id,
      providerTxnId,
      bookedAt,
      amount: row.amount,
      description: row.description,
    });
    if (created) imported += 1;
    else duplicates += 1;
  }

  const matchResult =
    imported > 0
      ? await matchPendingBankTransactions(branchId)
      : { matched: 0, exceptions: 0, skipped: 0 };

  return {
    credits: rows.length,
    imported,
    duplicates,
    matched: matchResult.matched,
    exceptions: matchResult.exceptions,
  };
}
