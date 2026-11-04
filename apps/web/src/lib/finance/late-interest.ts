/**
 * Late rent interest under the Tenant Fees Act 2019: only once rent is more than
 * 14 days late, at no more than 3% above the Bank of England base rate a year,
 * on the amount outstanding, counted from the day the rent was due.
 */
export const LATE_RENT_MIN_DAYS = 14;
export const MAX_MARGIN_OVER_BASE = 3;

export function daysBetween(fromIso: string, to: Date): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.floor((end - from) / 86400000);
}

export function lateInterest(input: {
  outstanding: number;
  dueDate: string;
  now: Date;
  baseRate: number;
  margin: number;
}): { days: number; rate: number; interest: number } {
  const days = daysBetween(input.dueDate, input.now);
  const rate = input.baseRate + Math.min(Math.max(input.margin, 0), MAX_MARGIN_OVER_BASE);
  if (days <= LATE_RENT_MIN_DAYS || input.outstanding <= 0) return { days, rate, interest: 0 };
  const interest = Math.floor(input.outstanding * (rate / 100) * (days / 365) * 100) / 100;
  return { days, rate, interest };
}
