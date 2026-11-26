import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

const LONDON = "Europe/London";

function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  // Plain dates ("2026-10-01") are calendar days, not instants: read them at noon
  // UTC so no time zone can push them onto the day before or after.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00Z`);
  return new Date(value);
}

/** "1 Oct 2026". Use for dates in tables and lists. */
export function formatDay(value: string | Date | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: LONDON,
  }).format(d);
}

/** "23 Nov 2026, 09:22" in UK time, never with seconds. */
export function formatDateTime(value: string | Date | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: LONDON,
  }).format(d);
}

/** "1 Oct 2026 to 31 Oct 2026", shortened to "1 to 31 Oct 2026" within a month. */
export function formatDayRange(from: string | Date, to: string | Date): string {
  const a = formatDay(from);
  const b = formatDay(to);
  const [ad, am, ay] = a.split(" ");
  const [, bm, by] = b.split(" ");
  if (am === bm && ay === by) return `${ad} to ${b}`;
  return `${a} to ${b}`;
}

/** "£1,908.00", with a real minus sign before the pound sign: "−£135.00". */
export function formatMoney(amount: number | string | null | undefined, opts: { pence?: boolean } = {}): string {
  const n = Number(amount ?? 0);
  const pence = opts.pence ?? true;
  const text = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: pence ? 2 : 0,
    maximumFractionDigits: pence ? 2 : 0,
  }).format(Math.abs(n));
  return n < -0.004 ? `−${text}` : text;
}

/** Turn stored values like "viewing_booked" or "damp_mould" into "Viewing booked" / "Damp & mould". */
export function humanize(value: string | null | undefined): string {
  if (!value) return "";
  const known: Record<string, string> = {
    damp_mould: "Damp & mould",
    locks_security: "Locks & security",
    closed_won: "Let agreed",
    closed_lost: "Closed",
    viewing_booked: "Viewing booked",
    rra_info_sheet: "RRA info sheet",
    eicr: "EICR",
    epc: "EPC",
    hmo_licence: "HMO licence",
    smoke_co: "Smoke & CO alarms",
  };
  if (known[value]) return known[value];
  // Already written for people ("Seen 3 Nov", "Let Agreed"): leave it alone.
  if (!/^[a-z0-9_-]+$/.test(value)) return value;
  const words = value.replaceAll("_", " ").replaceAll("-", " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
