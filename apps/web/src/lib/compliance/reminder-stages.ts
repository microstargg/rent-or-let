/** Pure helpers for landlord compliance reminder timing. */

/** Reminder points before expiry, smallest last. "expired" is sent once on expiry. */
const STAGES = [60, 30, 7] as const;
export type ReminderStage = (typeof STAGES)[number] | "expired";

export function ukDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function daysUntil(iso: string, now: Date) {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((new Date(`${iso}T00:00:00Z`).getTime() - start) / 86400000);
}

/**
 * The reminder due today for a record, or null. Sending one stage also counts
 * the earlier (larger) stages as done, so a record first seen at 5 days out
 * gets one email, not three.
 */
export function dueReminderStage(
  expiresAt: string | null,
  sent: readonly string[],
  now: Date
): ReminderStage | null {
  if (!expiresAt) return null;
  const days = daysUntil(expiresAt, now);
  if (days < 0) return sent.includes("expired") ? null : "expired";
  const stage = [...STAGES].reverse().find((s) => days <= s);
  if (stage === undefined) return null;
  return sent.includes(String(stage)) ? null : stage;
}

export function stagesCoveredBy(stage: ReminderStage): string[] {
  if (stage === "expired") return ["60", "30", "7", "expired"];
  return STAGES.filter((s) => s >= stage).map(String);
}

