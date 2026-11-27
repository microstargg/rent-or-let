/**
 * When a tenancy's rent falls due.
 *
 * `tenancies.rent_frequency` says how often, and `metadata.rent_schedule.from` says the
 * date the schedule counts from (a rent due date). Monthly rent falls on that day of
 * each month, moved to the last day in shorter months. Weekly, fortnightly and
 * four-weekly rent falls every 7, 14 or 28 days from it.
 *
 * Tenancies set up before schedules existed have no `from` date: their rent stays
 * monthly on the 1st, as it always was.
 */

export const RENT_FREQUENCIES = ["weekly", "fortnightly", "four_weekly", "monthly"] as const;
export type RentFrequency = (typeof RENT_FREQUENCIES)[number];

/** For pickers, most common first. */
export const RENT_FREQUENCY_OPTIONS: { value: RentFrequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "four_weekly", label: "Every 4 weeks" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "weekly", label: "Weekly" },
];

export interface RentSchedule {
  frequency: RentFrequency;
  /** First due date the schedule counts from (ISO). Null = legacy monthly on the 1st. */
  from: string | null;
}

const STEP_DAYS: Record<Exclude<RentFrequency, "monthly">, number> = {
  weekly: 7,
  fortnightly: 14,
  four_weekly: 28,
};

export function isRentFrequency(v: unknown): v is RentFrequency {
  return typeof v === "string" && (RENT_FREQUENCIES as readonly string[]).includes(v);
}

export function parseRentSchedule(tenancy: { rentFrequency: string | null; metadata: unknown }): RentSchedule {
  const frequency = isRentFrequency(tenancy.rentFrequency) ? tenancy.rentFrequency : "monthly";
  const meta = (tenancy.metadata ?? {}) as Record<string, unknown>;
  const raw = (meta.rent_schedule ?? {}) as Record<string, unknown>;
  const from = typeof raw.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.from) ? raw.from : null;
  return { frequency, from };
}

/** "a week", "a fortnight", "every 4 weeks", "a month". */
export function rentPeriodLabel(frequency: string | null | undefined): string {
  switch (frequency) {
    case "weekly":
      return "a week";
    case "fortnightly":
      return "a fortnight";
    case "four_weekly":
      return "every 4 weeks";
    default:
      return "a month";
  }
}

/** "Weekly", "Fortnightly", "Every 4 weeks", "Monthly". */
export function rentFrequencyName(frequency: string | null | undefined): string {
  switch (frequency) {
    case "weekly":
      return "Weekly";
    case "fortnightly":
      return "Fortnightly";
    case "four_weekly":
      return "Every 4 weeks";
    default:
      return "Monthly";
  }
}

/** Plural noun for a count of rent periods: "weeks", "fortnights", "4-week periods", "months". */
export function rentPeriodsNoun(frequency: string | null | undefined): string {
  switch (frequency) {
    case "weekly":
      return "weeks";
    case "fortnightly":
      return "fortnights";
    case "four_weekly":
      return "4-week periods";
    default:
      return "months";
  }
}

/** Short suffix for a rent amount: "pw", "per fortnight", "per 4 weeks", "pcm". */
export function rentShortSuffix(frequency: string | null | undefined): string {
  switch (frequency) {
    case "weekly":
      return "pw";
    case "fortnightly":
      return "per fortnight";
    case "four_weekly":
      return "per 4 weeks";
    default:
      return "pcm";
  }
}

function toDate(iso: string): Date {
  return new Date(`${iso}T12:00:00.000Z`);
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

function daysBetween(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);
}

function monthlyDate(year: number, monthIndex: number, day: number): string {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return toIso(new Date(Date.UTC(year, monthIndex, Math.min(day, last), 12)));
}

/**
 * Every due date on the schedule between `from` and `to` (inclusive), never before the
 * tenancy starts (legacy monthly) or before the schedule's own start date.
 */
export function rentDueDatesBetween(
  schedule: RentSchedule,
  tenancyStart: string,
  from: string,
  to: string
): string[] {
  if (from > to) return [];
  const out: string[] = [];

  if (schedule.frequency === "monthly") {
    const anchor = schedule.from;
    const day = anchor ? Number(anchor.slice(8, 10)) : 1;
    // Legacy schedules only charge once the tenancy has started, as before.
    const floor = anchor ?? tenancyStart;
    const lower = from > floor ? from : floor;
    let y = Number(lower.slice(0, 4));
    let m = Number(lower.slice(5, 7)) - 1;
    for (let i = 0; i < 600; i++) {
      const date = monthlyDate(y, m, day);
      if (date > to) break;
      if (date >= lower) out.push(date);
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
    return out;
  }

  const step = STEP_DAYS[schedule.frequency];
  const anchor = schedule.from ?? tenancyStart;
  const lower = from > anchor ? from : anchor;
  const skip = Math.ceil(daysBetween(anchor, lower) / step);
  for (let date = addDaysIso(anchor, skip * step); date <= to; date = addDaysIso(date, step)) {
    out.push(date);
  }
  return out;
}

/** First due date on or after `day`. */
export function nextRentDueOnOrAfter(schedule: RentSchedule, tenancyStart: string, day: string): string | null {
  return rentDueDatesBetween(schedule, tenancyStart, day, addDaysIso(day, 62))[0] ?? null;
}

/**
 * How far ahead rent is raised. Monthly keeps its old month-ahead invoice; shorter
 * schedules are raised two weeks ahead so the list of upcoming rent stays short.
 */
export function rentLookaheadDays(frequency: RentFrequency): number {
  return frequency === "monthly" ? 31 : 14;
}

/** How far back a missed daily run catches up. */
export const RENT_CATCH_UP_DAYS = 31;

/** Today's date in London (ISO). */
export function londonToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now);
}
