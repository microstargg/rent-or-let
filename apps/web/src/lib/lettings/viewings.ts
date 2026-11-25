/** Viewing outcomes and the messages sent around a viewing. */

export const VIEWING_OUTCOMES = [
  { value: "attended", label: "Attended" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not interested" },
  { value: "no_show", label: "No show" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export type ViewingOutcome = (typeof VIEWING_OUTCOMES)[number]["value"];

export function outcomeLabel(value: string | null | undefined): string {
  return VIEWING_OUTCOMES.find((o) => o.value === value)?.label ?? "Booked";
}

export function viewingWhen(at: Date): string {
  return at.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

export function viewingConfirmation(o: { name: string; address: string; at: Date; agency: string }) {
  const when = viewingWhen(o.at);
  return {
    subject: `Viewing booked: ${o.address}`,
    text: `Hi ${o.name},\n\nYour viewing of ${o.address} is booked for ${when}.\n\nIf you can no longer make it, please reply to let us know so we can offer the slot to someone else.\n\n${o.agency}`,
    sms: `${o.agency}: your viewing of ${o.address} is booked for ${when}. Reply or call us if you can't make it.`,
  };
}

export function viewingReminder(o: { name: string; address: string; at: Date; agency: string }) {
  const when = viewingWhen(o.at);
  return {
    subject: `Reminder: viewing tomorrow at ${o.address}`,
    text: `Hi ${o.name},\n\nA reminder that your viewing of ${o.address} is on ${when}.\n\nIf you can no longer make it, please let us know.\n\n${o.agency}`,
    sms: `${o.agency}: reminder of your viewing at ${o.address}, ${when}. Let us know if you can't make it.`,
  };
}

export function landlordViewingFeedback(o: {
  landlordName: string;
  address: string;
  at: Date;
  outcome: string | null;
  feedback: string;
  agency: string;
}) {
  return {
    subject: `Viewing feedback: ${o.address}`,
    text: `Hi ${o.landlordName},\n\nHere is the feedback from the viewing of ${o.address} on ${viewingWhen(o.at)}.\n\nOutcome: ${outcomeLabel(o.outcome)}\n\n${o.feedback}\n\n${o.agency}`,
  };
}

/** Tenants must get at least 24 hours' written notice before a visit (Landlord and Tenant Act 1985, s.11). */
export const ACCESS_NOTICE_HOURS = 24;

export function accessNotice(o: { name: string; address: string; at: Date; purpose: string; agency: string }) {
  const when = viewingWhen(o.at);
  return {
    subject: `Notice of visit: ${o.address}`,
    text: `Hi ${o.name},\n\nThis is notice that we will visit ${o.address} on ${when} for ${o.purpose}.\n\nIf this time doesn't suit, please reply and we'll find another.\n\n${o.agency}`,
    sms: `${o.agency}: notice that we'll visit ${o.address} on ${when} for ${o.purpose}. Reply if the time doesn't suit.`,
  };
}
