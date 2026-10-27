import { z } from "zod";
import { generateAiObjectFromFile } from "@/lib/ai/client";
import type { CsvStatementRow } from "@/lib/bank-feed/csv-import";

const statementSchema = z.object({
  moneyInTotal: z
    .number()
    .nullable()
    .describe("Total money in / payments in printed in the statement's summary, or null if none"),
  transactions: z.array(
    z.object({
      date: z.string().describe("Booking date as YYYY-MM-DD"),
      description: z
        .string()
        .describe(
          "Full description exactly as printed, joined with every detail line under it (Reference:, From:, payer name)"
        ),
      moneyIn: z.number().nullable().describe("Amount paid in (credit), or null"),
      moneyOut: z.number().nullable().describe("Amount paid out (debit), or null"),
    })
  ),
});

const SYSTEM = `You read UK bank statements and list every transaction line.
Copy each description exactly as printed, and append every detail line printed under that transaction (such as "Reference: ...", "From: ...", or a second payer line), because the tenant's payment reference is often on one of those lines. Keep references like ROL-AB12CD intact; do not tidy or shorten them.
Dates on UK statements are day/month order. Where a date is printed once for several lines, apply it to each of them.
Use the statement's paid in / money in / credit column for moneyIn and paid out / money out / debit for moneyOut.
Amounts are in pounds: ignore foreign-currency amounts, exchange rate lines and fee sub-lines.
Skip balance brought forward, balance carried forward, and running balance figures. Never invent lines.
Also give the total money in / payments in printed in the statement summary, if there is one.`;

/**
 * Credits from a PDF bank statement, read by the AI model, in the same shape as a CSV
 * import, plus the money-in total printed on the statement so the read can be checked.
 */
export async function parseStatementPdf(
  data: Uint8Array,
  filename?: string
): Promise<{ rows: CsvStatementRow[]; statementMoneyIn: number | null }> {
  const { transactions, moneyInTotal } = await generateAiObjectFromFile({
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
  const statementMoneyIn =
    moneyInTotal != null && Number.isFinite(moneyInTotal) ? Math.round(moneyInTotal * 100) / 100 : null;
  return { rows, statementMoneyIn };
}
