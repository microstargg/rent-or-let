type OpeningHours = Array<{ day: string; hours: string }>;

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Current weekday (0 = Sunday) and minutes past midnight in UK time. */
function ukNow(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: DAYS.indexOf(get("weekday").toLowerCase()),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** Parses "10:00 – 17:00" (any dash) into minutes; null for "Closed" or anything unrecognised. */
function parseRange(hours: string): { open: number; close: number; closeLabel: string; openLabel: string } | null {
  const match = hours.match(/(\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, oh, om, ch, cm] = match;
  return {
    open: Number(oh) * 60 + Number(om),
    close: Number(ch) * 60 + Number(cm),
    openLabel: `${oh.padStart(2, "0")}:${om}`,
    closeLabel: `${ch.padStart(2, "0")}:${cm}`,
  };
}

function hoursFor(hours: OpeningHours, day: number) {
  const row = hours.find((entry) => entry.day.trim().toLowerCase() === DAYS[day]);
  return row ? parseRange(row.hours) : null;
}

/** The weekday name (as written in the agency's hours) for today in UK time, if listed. */
export function todayName(now: Date = new Date()): string {
  const { day } = ukNow(now);
  const name = DAYS[day] ?? "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Short office status from the agency's published hours, e.g. "Office open · until 17:00"
 * or "Office closed · opens Monday 10:00". Null when hours can't be read.
 */
export function officeStatus(
  hours: OpeningHours | undefined,
  now: Date = new Date()
): { open: boolean; label: string } | null {
  if (!hours || hours.length === 0) return null;
  const { day, minutes } = ukNow(now);
  const today = hoursFor(hours, day);
  if (today && minutes >= today.open && minutes < today.close) {
    return { open: true, label: `Office open · until ${today.closeLabel}` };
  }
  if (today && minutes < today.open) {
    return { open: false, label: `Office closed · opens ${today.openLabel}` };
  }
  for (let offset = 1; offset <= 7; offset++) {
    const next = (day + offset) % 7;
    const range = hoursFor(hours, next);
    if (range) {
      const name = offset === 1 ? "tomorrow" : DAYS[next].charAt(0).toUpperCase() + DAYS[next].slice(1);
      return { open: false, label: `Office closed · opens ${name} ${range.openLabel}` };
    }
  }
  return null;
}
