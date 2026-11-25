/** Per-staff notification choices, stored in staff_profiles.notification_prefs. */
export type DigestFrequency = "weekdays" | "daily" | "weekly" | "off";

export interface NotificationPrefs {
  /** Morning email: weekdays (default), every day, Mondays only, or never. */
  digest: DigestFrequency;
  /** Instant emails for urgent things (job assigned to you, emergency tickets). */
  instantEmail: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  digest: "weekdays",
  instantEmail: true,
};

const FREQUENCIES: DigestFrequency[] = ["weekdays", "daily", "weekly", "off"];

export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const digest = FREQUENCIES.includes(o.digest as DigestFrequency)
    ? (o.digest as DigestFrequency)
    : DEFAULT_NOTIFICATION_PREFS.digest;
  const instantEmail =
    typeof o.instantEmail === "boolean" ? o.instantEmail : DEFAULT_NOTIFICATION_PREFS.instantEmail;
  return { digest, instantEmail };
}

export const DIGEST_LABELS: Record<DigestFrequency, string> = {
  weekdays: "Weekdays (Monday to Friday)",
  daily: "Every day",
  weekly: "Mondays only",
  off: "Off",
};

/** UK calendar date (YYYY-MM-DD) for a moment, so "today" matches the office clock. */
export function londonDateKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** 0 = Sunday … 6 = Saturday, in UK time. */
export function londonWeekday(d: Date = new Date()): number {
  const name = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short" }).format(d);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

export function digestDueToday(freq: DigestFrequency, now: Date = new Date()): boolean {
  const day = londonWeekday(now);
  switch (freq) {
    case "daily":
      return true;
    case "weekdays":
      return day >= 1 && day <= 5;
    case "weekly":
      return day === 1;
    default:
      return false;
  }
}

/** Who receives certificate, inspection and pet request alerts. */
export type ComplianceAlertAudience = "admins" | "everyone";
