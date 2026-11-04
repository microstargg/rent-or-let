/** Move-in and move-out notices to the council and utility companies, with meter readings. */

export type UtilityNoticeKind = "move_in" | "move_out";

export interface UtilityContact {
  name: string;
  email: string;
}

export interface MeterReading {
  type: string;
  reading: string;
}

export interface UtilityNoticeRecord {
  sentAt: string;
  date: string;
  to: string[];
}

export type UtilityNotices = Partial<Record<UtilityNoticeKind, UtilityNoticeRecord>>;

export function parseUtilityNotices(raw: unknown): UtilityNotices {
  if (!raw || typeof raw !== "object") return {};
  return raw as UtilityNotices;
}

export function parseUtilityContacts(raw: unknown): UtilityContact[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is UtilityContact => Boolean(c && typeof c.email === "string" && c.email.includes("@")))
    .map((c) => ({ name: String(c.name ?? "").slice(0, 80), email: c.email.trim() }))
    .slice(0, 8);
}

function ukDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function utilityNotice(o: {
  kind: UtilityNoticeKind;
  recipient: string;
  address: string;
  tenants: string[];
  date: string;
  meters: MeterReading[];
  forwardingAddress?: string | null;
  agency: string;
  agencyEmail?: string | null;
}) {
  const moving = o.kind === "move_in" ? "moved in to" : "moved out of";
  const names = o.tenants.join(", ");
  const readings = o.meters.filter((m) => m.reading.trim());
  const meterText = readings.length
    ? `Meter readings on ${ukDate(o.date)}:\n${readings.map((m) => `- ${m.type.charAt(0).toUpperCase() + m.type.slice(1)}: ${m.reading}`).join("\n")}`
    : "We don't have meter readings for this date.";
  const forwarding =
    o.kind === "move_out"
      ? o.forwardingAddress?.trim()
        ? `\n\nForwarding address for the outgoing tenants:\n${o.forwardingAddress.trim()}`
        : ""
      : "";
  return {
    subject: `Change of occupier: ${o.address}`,
    text: `Dear ${o.recipient || "Sir or Madam"},\n\nWe manage ${o.address} and are writing to tell you about a change of occupier.\n\n${names} ${moving} the property on ${ukDate(o.date)}${o.kind === "move_in" ? " and should be billed from that date" : ". Please close their account from that date"}.\n\n${meterText}${forwarding}\n\nPlease contact us${o.agencyEmail ? ` at ${o.agencyEmail}` : ""} if you need anything else.\n\nKind regards,\n${o.agency}`,
  };
}
