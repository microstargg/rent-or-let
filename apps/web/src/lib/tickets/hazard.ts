/**
 * Damp, mould and other hazard response clocks, following Awaab's Law timescales
 * (Hazards in Social Housing (Prescribed Requirements) (England) Regulations 2025).
 * The Renters' Rights Act lets the government apply the same duty to private
 * rentals; until it does these are good-practice deadlines, not statutory ones.
 */

export type HazardLevel = "significant" | "emergency";

export interface HazardState {
  level: HazardLevel;
  /** When the agency first knew about it (ISO datetime). */
  awareAt: string;
  investigatedAt?: string | null;
  summarySentAt?: string | null;
  safetyWorkStartedAt?: string | null;
  notes?: string | null;
}

export const HAZARD_STEPS = [
  { key: "investigatedAt", label: "Investigate" },
  { key: "summarySentAt", label: "Send the tenant a written summary" },
  { key: "safetyWorkStartedAt", label: "Start work to make it safe" },
] as const;

export type HazardStepKey = (typeof HAZARD_STEPS)[number]["key"];

/** England and Wales bank holidays (gov.uk). */
const BANK_HOLIDAYS = new Set([
  "2025-01-01", "2025-04-18", "2025-04-21", "2025-05-05", "2025-05-26", "2025-08-25", "2025-12-25", "2025-12-26",
  "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28",
  "2027-01-01", "2027-03-26", "2027-03-29", "2027-05-03", "2027-05-31", "2027-08-30", "2027-12-27", "2027-12-28",
  "2028-01-03", "2028-04-14", "2028-04-17", "2028-05-01", "2028-05-29", "2028-08-28", "2028-12-25", "2028-12-26",
]);

function isWorkingDay(d: Date): boolean {
  const day = d.getUTCDay();
  return day !== 0 && day !== 6 && !BANK_HOLIDAYS.has(d.toISOString().slice(0, 10));
}

/** End of the nth working day after `from` (the day itself doesn't count). */
export function addWorkingDays(from: Date, n: number): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (isWorkingDay(d)) left -= 1;
  }
  d.setUTCHours(23, 59, 59, 0);
  return d;
}

export function parseHazard(raw: unknown): HazardState | null {
  if (!raw || typeof raw !== "object") return null;
  const h = raw as Partial<HazardState>;
  if (!h.awareAt || (h.level !== "significant" && h.level !== "emergency")) return null;
  return {
    level: h.level,
    awareAt: h.awareAt,
    investigatedAt: h.investigatedAt ?? null,
    summarySentAt: h.summarySentAt ?? null,
    safetyWorkStartedAt: h.safetyWorkStartedAt ?? null,
    notes: h.notes ?? null,
  };
}

/** The saved clock, or an implied one for damp and mould tickets that haven't been set up yet. */
export function hazardForTicket(t: {
  hazard: unknown;
  category: string | null;
  isEmergency: boolean;
  createdAt: Date;
}): HazardState | null {
  const saved = parseHazard(t.hazard);
  if (saved) return saved;
  if (t.category !== "damp_mould") return null;
  return { level: t.isEmergency ? "emergency" : "significant", awareAt: t.createdAt.toISOString() };
}

export interface HazardStepStatus {
  key: HazardStepKey;
  label: string;
  dueAt: Date | null;
  doneAt: string | null;
  state: "done" | "overdue" | "due_soon" | "pending" | "waiting";
}

/**
 * Emergency: investigate and make safe within 24 hours.
 * Significant: investigate within 10 working days; then a written summary within
 * 3 working days and safety work started within 5 working days of the investigation.
 */
export function hazardSchedule(h: HazardState, now = new Date()): HazardStepStatus[] {
  const aware = new Date(h.awareAt);
  const investigated = h.investigatedAt ? new Date(h.investigatedAt) : null;
  const due: Record<HazardStepKey, Date | null> =
    h.level === "emergency"
      ? {
          investigatedAt: new Date(aware.getTime() + 24 * 3_600_000),
          summarySentAt: investigated ? addWorkingDays(investigated, 3) : null,
          safetyWorkStartedAt: new Date(aware.getTime() + 24 * 3_600_000),
        }
      : {
          investigatedAt: addWorkingDays(aware, 10),
          summarySentAt: investigated ? addWorkingDays(investigated, 3) : null,
          safetyWorkStartedAt: investigated ? addWorkingDays(investigated, 5) : null,
        };
  return HAZARD_STEPS.map(({ key, label }) => {
    const doneAt = h[key] ?? null;
    const dueAt = due[key];
    let state: HazardStepStatus["state"];
    if (doneAt) state = "done";
    else if (!dueAt) state = "waiting";
    else if (dueAt.getTime() < now.getTime()) state = "overdue";
    else if (dueAt.getTime() - now.getTime() < 2 * 86_400_000) state = "due_soon";
    else state = "pending";
    return {
      key,
      label: h.level === "emergency" && key === "safetyWorkStartedAt" ? "Make it safe" : label,
      dueAt,
      doneAt,
      state,
    };
  });
}

/** The next step that needs doing, for lists and the morning email. */
export function nextHazardStep(h: HazardState, now = new Date()): HazardStepStatus | null {
  const steps = hazardSchedule(h, now).filter((s) => s.state !== "done" && s.state !== "waiting");
  steps.sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0));
  return steps[0] ?? null;
}
