/** Holding deposits (Tenant Fees Act 2019) and end-of-tenancy deposit returns. */

export const HOLDING_DEPOSIT_DEADLINE_DAYS = 15;

/** One week's rent, the legal cap on a holding deposit. */
export function weeklyRent(monthlyRent: number): number {
  return Math.floor(((monthlyRent * 12) / 52) * 100) / 100;
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type HoldingDepositOutcome = "applied" | "refunded" | "retained";

export const HOLDING_DEPOSIT_OUTCOMES: { value: HoldingDepositOutcome; label: string }[] = [
  { value: "applied", label: "Put towards first rent or deposit" },
  { value: "refunded", label: "Refunded" },
  { value: "retained", label: "Kept (tenant withdrew, failed Right to Rent or gave false information)" },
];

export function holdingDepositIssues(input: {
  amount: number;
  monthlyRent: number | null;
  outcome?: HoldingDepositOutcome | null;
  note?: string | null;
}): string[] {
  const issues: string[] = [];
  if (input.monthlyRent && input.amount > weeklyRent(input.monthlyRent) + 0.005) {
    issues.push(
      `A holding deposit can't be more than one week's rent (£${weeklyRent(input.monthlyRent).toFixed(2)}).`
    );
  }
  if (input.outcome === "retained" && !input.note?.trim()) {
    issues.push("Say why the holding deposit is being kept. The tenant must be told in writing within 7 days.");
  }
  return issues;
}

export interface DepositDeduction {
  reason: string;
  amount: number;
}

export interface DepositReturn {
  deductions: DepositDeduction[];
  toTenant: number;
  toLandlord: number;
  /** proposed | agreed | disputed | paid */
  status: "proposed" | "agreed" | "disputed" | "paid";
  proposedAt?: string;
  agreedAt?: string;
  paidAt?: string;
  dispute?: {
    openedAt: string;
    schemeCaseRef?: string;
    outcome?: string;
    resolvedAt?: string;
  };
  notes?: string;
}

export function parseDepositReturn(raw: unknown): DepositReturn | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<DepositReturn>;
  return {
    deductions: Array.isArray(r.deductions)
      ? r.deductions
          .filter((d) => d && typeof d.reason === "string")
          .map((d) => ({ reason: d.reason, amount: Number(d.amount) || 0 }))
      : [],
    toTenant: Number(r.toTenant) || 0,
    toLandlord: Number(r.toLandlord) || 0,
    status: r.status ?? "proposed",
    proposedAt: r.proposedAt,
    agreedAt: r.agreedAt,
    paidAt: r.paidAt,
    dispute: r.dispute,
    notes: r.notes,
  };
}

/** Deductions go to the landlord; the rest of the deposit goes back to the tenant. */
export function splitDeposit(deposit: number, deductions: DepositDeduction[]) {
  const total = Math.round(deductions.reduce((s, d) => s + Math.max(0, d.amount), 0) * 100) / 100;
  if (total > deposit + 0.005) {
    return { ok: false as const, error: `Deductions (£${total.toFixed(2)}) are more than the deposit (£${deposit.toFixed(2)}).` };
  }
  return {
    ok: true as const,
    toLandlord: total,
    toTenant: Math.round((deposit - total) * 100) / 100,
  };
}
