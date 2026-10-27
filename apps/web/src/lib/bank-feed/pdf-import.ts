import { z } from "zod";
import { generateAiObjectFromFile } from "@/lib/ai/client";
import type { CsvStatementRow } from "@/lib/bank-feed/csv-import";

const statementSchema = z.object({
  transactions: z.array(
    z.object({
      date: z.string().describe("Booking date as YYYY-MM-DD"),
      description: z
        .string()
        .describe("Full description/reference text exactly as printed, including any payment reference"),
      moneyIn: z.number().nullable().describe("Amount paid in (credit), or null"),
      moneyOut: z.number().nullable().describe("Amount paid out (debit), or null"),
    })
  ),
});

const SYSTEM = `You read UK bank statements and list every transaction line.
Copy each description exactly as printed (keep references like ROL-AB12CD intact, do not tidy or shorten them).
Dates on UK statements are day/month order. Where a date is printed once for several lines, apply it to each of them.
Use the statement's paid in / money in / credit column for moneyIn and paid out / money out / debit for moneyOut.
Skip balance brought forward, balance carried forward, and running balance figures. Never invent lines.`;

/** Credits from a PDF bank statement, read by the AI model, in the same shape as a CSV import. */
export async function parseStatementPdf(
  data: Uint8Array,
  filename?: string
): Promise<CsvStatementRow[]> {
  const { transactions } = await generateAiObjectFromFile({
    schema: statementSchema,
    system: SYSTEM,
    prompt: "List every transaction on this bank statement.",
    file: { data, mediaType: "application/pdf", filename },
  });

  const rows: CsvStatementRow[] = [];
  for (const t of transactions) {
    const amount = Math.round(Number(t.moneyIn ?? 0) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date)) continue;
    rows.push({ date: t.date, description: t.description.trim(), amount });
  }
  return rows;
}
