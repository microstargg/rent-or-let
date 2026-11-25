/** UK tax year and NRL quarter maths for landlord ledger entries. */

export const NRL_BASIC_RATE = 20;

/** Tax year starting 6 April `startYear`. */
export function taxYearRange(startYear: number): { from: string; to: string; label: string } {
  return {
    from: `${startYear}-04-06`,
    to: `${startYear + 1}-04-05`,
    label: `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`,
  };
}

/** The tax year a date falls in, as its starting year. */
export function taxYearOf(date: Date): number {
  const y = date.getUTCFullYear();
  const beforeApril6 = date.getUTCMonth() < 3 || (date.getUTCMonth() === 3 && date.getUTCDate() < 6);
  return beforeApril6 ? y - 1 : y;
}

/** NRL quarters end 30 June, 30 September, 31 December and 31 March. */
export function nrlQuarterOf(date: Date): { key: string; from: string; to: string; label: string } {
  const y = date.getUTCFullYear();
  const q = Math.floor(date.getUTCMonth() / 3); // 0: Jan-Mar
  const starts = ["01-01", "04-01", "07-01", "10-01"];
  const ends = ["03-31", "06-30", "09-30", "12-31"];
  const names = ["January to March", "April to June", "July to September", "October to December"];
  return { key: `${y}-Q${q + 1}`, from: `${y}-${starts[q]}`, to: `${y}-${ends[q]}`, label: `${names[q]} ${y}` };
}

export function previousNrlQuarter(date: Date) {
  const q = nrlQuarterOf(date);
  const d = new Date(`${q.from}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return nrlQuarterOf(d);
}

export type TaxCategory = "rent" | "agent_fees" | "repairs" | "other" | "not_income";

/** How a landlord ledger entry counts for income tax. Payouts and tax withheld aren't income or expenses. */
export function taxCategory(entryType: string): TaxCategory {
  switch (entryType) {
    case "rent_received":
      return "rent";
    case "management_fee":
    case "letting_fee":
      return "agent_fees";
    case "work_order_cost":
      return "repairs";
    case "payout":
    case "nrl_tax":
      return "not_income";
    default:
      return "other";
  }
}

export interface TaxTotals {
  rent: number;
  agentFees: number;
  repairs: number;
  other: number;
  profit: number;
  taxWithheld: number;
}

export function summariseForTax(entries: { entryType: string; amount: number | string }[]): TaxTotals {
  const t: TaxTotals = { rent: 0, agentFees: 0, repairs: 0, other: 0, profit: 0, taxWithheld: 0 };
  for (const e of entries) {
    const amt = Number(e.amount) || 0;
    const cat = taxCategory(e.entryType);
    if (cat === "rent") t.rent += amt;
    else if (cat === "agent_fees") t.agentFees += -amt;
    else if (cat === "repairs") t.repairs += -amt;
    else if (cat === "other") t.other += -amt;
    if (e.entryType === "nrl_tax") t.taxWithheld += -amt;
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  t.rent = r(t.rent);
  t.agentFees = r(t.agentFees);
  t.repairs = r(t.repairs);
  t.other = r(t.other);
  t.taxWithheld = r(t.taxWithheld);
  t.profit = r(t.rent - t.agentFees - t.repairs - Math.max(0, t.other));
  return t;
}

/** Basic rate tax on the quarter's profit, less anything already withheld for it. */
export function nrlTaxDue(totals: TaxTotals): number {
  const due = Math.max(0, totals.profit) * (NRL_BASIC_RATE / 100) - totals.taxWithheld;
  return Math.max(0, Math.round(due * 100) / 100);
}

export function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
