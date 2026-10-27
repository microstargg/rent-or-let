import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencyEq, currentAgencyId } from "@/lib/db/agency-scope";
import { bankConnections } from "@/lib/db/schema";
import { ensureBankFeed, insertBankTransaction } from "@/lib/db/queries/bank-feed";
import { matchPendingBankTransactions } from "@/lib/bank-feed/sync";
import { csvProviderTxnId } from "@/lib/payment-ref";

export async function ensureCsvBankConnection(branchId: string) {
  await ensureBankFeed();
  const [existing] = await db
    .select()
    .from(bankConnections)
    .where(
      and(
        agencyEq(bankConnections.agencyId),
        eq(bankConnections.branchId, branchId),
        eq(bankConnections.provider, "csv")
      )
    )
    .limit(1);
  if (existing) {
    if (existing.status !== "active") {
      const [updated] = await db
        .update(bankConnections)
        .set({ status: "active", updatedAt: new Date() })
        .where(and(eq(bankConnections.id, existing.id), agencyEq(bankConnections.agencyId)))
        .returning();
      return updated ?? existing;
    }
    return existing;
  }

  const [created] = await db
    .insert(bankConnections)
    .values({
      agencyId: currentAgencyId(),
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

const DATE_HEADERS = ["date", "booking date", "booked", "transaction date", "posting date", "value date"];
const DESCRIPTION_HEADERS = [
  "description",
  "transaction description",
  "narrative",
  "details",
  "reference",
  "memo",
  "payee",
  "counter party",
  "name",
];
const CREDIT_HEADERS = ["credit", "credit amount", "paid in", "money in", "in"];
const AMOUNT_HEADERS = ["amount", "value", "amount (gbp)", "amount(gbp)", "amount gbp"];

function headerIndex(headers: string[], names: string[]): number {
  for (const name of names) {
    const idx = headers.indexOf(name);
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseMoney(raw: string | undefined): number {
  const cleaned = (raw ?? "").trim().replace(/[£,\s]/g, "");
  if (!cleaned) return NaN;
  // Some banks show debits as (12.50)
  const negative = /^\(.*\)$/.test(cleaned);
  const n = Number(cleaned.replace(/[()]/g, ""));
  return negative ? -n : n;
}

/**
 * Parse a bank statement CSV export. Needs a date column, a description column and
 * either a signed Amount column (positive = credit) or a separate Credit / Paid in column,
 * which covers the usual UK bank exports. Only credits are returned.
 */
export function parseStatementCsv(text: string): CsvStatementRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headerCells = splitCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const dateIdx = headerIndex(headerCells, DATE_HEADERS);
  const creditIdx = headerIndex(headerCells, CREDIT_HEADERS);
  const amountIdx = creditIdx >= 0 ? creditIdx : headerIndex(headerCells, AMOUNT_HEADERS);
  // Use every text column that looks like a description, so a reference in either is seen.
  const descIdxs = DESCRIPTION_HEADERS.map((h) => headerCells.indexOf(h)).filter((i) => i >= 0);

  if (dateIdx < 0 || descIdxs.length === 0 || amountIdx < 0) {
    throw new Error(
      "CSV must include a Date column, a Description (or Reference) column, and an Amount or Credit column"
    );
  }

  const rows: CsvStatementRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    const dateRaw = (cells[dateIdx] ?? "").trim();
    const description = [...new Set(descIdxs.map((idx) => (cells[idx] ?? "").trim()).filter(Boolean))].join(" ");
    const amount = parseMoney(cells[amountIdx]);
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
  // UK order: DD/MM/YYYY or DD/MM/YY
  const m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4}|\d{2})$/);
  if (m) {
    const dd = m[1]!.padStart(2, "0");
    const mm = m[2]!.padStart(2, "0");
    const yyyy = m[3]!.length === 2 ? `20${m[3]}` : m[3];
    return `${yyyy}-${mm}-${dd}`;
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

  // Two identical lines on one day (e.g. two rent payments) are separate receipts;
  // number repeats so re-importing an overlapping statement still skips both.
  const seen = new Map<string, number>();
  for (const row of rows) {
    const key = csvProviderTxnId(row.date, row.amount, row.description);
    const occurrence = seen.get(key) ?? 0;
    seen.set(key, occurrence + 1);
    const providerTxnId = occurrence === 0 ? key : `${key}_${occurrence + 1}`;
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
