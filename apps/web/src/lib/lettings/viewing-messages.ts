import { getTenant } from "@repo/config/server";
import { sendEmail } from "@/lib/email/send";
import { isSmsConfigured, sendSms, toUkMobile } from "@/lib/sms/send";
import {
  getViewing,
  listViewingsForReminder,
  updateViewing,
  viewingContact,
} from "@/lib/db/queries/viewings";
import { landlordViewingFeedback, viewingConfirmation, viewingReminder } from "./viewings";

export interface SendOutcome {
  email: boolean;
  sms: boolean;
  errors: string[];
}

async function deliver(
  contact: { email: string | null; phone: string | null },
  msg: { subject: string; text: string; sms?: string }
): Promise<SendOutcome> {
  const out: SendOutcome = { email: false, sms: false, errors: [] };
  if (contact.email) {
    const r = await sendEmail({ to: contact.email, subject: msg.subject, text: msg.text });
    if (r.ok) out.email = true;
    else out.errors.push(r.error);
  }
  if (msg.sms && isSmsConfigured() && toUkMobile(contact.phone)) {
    const r = await sendSms(contact.phone!, msg.sms);
    if (r.ok) out.sms = true;
    else out.errors.push(r.error);
  }
  if (!contact.email && !toUkMobile(contact.phone)) out.errors.push("No email or mobile number for the viewer.");
  else if (!contact.email && !isSmsConfigured()) out.errors.push("Texts aren't set up and there's no email address.");
  return out;
}

export async function sendViewingConfirmation(viewingId: string): Promise<SendOutcome | null> {
  const row = await getViewing(viewingId);
  if (!row) return null;
  const contact = viewingContact(row);
  const result = await deliver(
    contact,
    viewingConfirmation({
      name: contact.name?.split(" ")[0] || "there",
      address: row.propertyAddress,
      at: row.viewing.scheduledAt,
      agency: getTenant().name,
    })
  );
  if (result.email || result.sms) await updateViewing(viewingId, { confirmedAt: new Date() });
  return result;
}

export async function sendLandlordViewingFeedback(viewingId: string) {
  const row = await getViewing(viewingId);
  if (!row) return { error: "Viewing not found" } as const;
  if (!row.landlordEmail) return { error: "The landlord has no email address." } as const;
  if (!row.viewing.feedback?.trim()) return { error: "Add some feedback first." } as const;
  const msg = landlordViewingFeedback({
    landlordName: row.landlordFirstName ?? "there",
    address: row.propertyAddress,
    at: row.viewing.scheduledAt,
    outcome: row.viewing.outcome,
    feedback: row.viewing.feedback.trim(),
    agency: getTenant().name,
  });
  const sent = await sendEmail({ to: row.landlordEmail, subject: msg.subject, text: msg.text });
  if (!sent.ok) return { error: sent.error } as const;
  await updateViewing(viewingId, { feedbackSentAt: new Date() });
  return { ok: true as const, to: row.landlordEmail };
}

/** Day-before reminders, from the morning cron. */
export async function sendViewingReminders(branchId: string, now = new Date()) {
  const rows = await listViewingsForReminder(branchId, now);
  let sent = 0;
  for (const row of rows) {
    const contact = viewingContact(row);
    const result = await deliver(
      contact,
      viewingReminder({
        name: contact.name?.split(" ")[0] || "there",
        address: row.propertyAddress,
        at: row.viewing.scheduledAt,
        agency: getTenant().name,
      })
    );
    if (result.email || result.sms) {
      await updateViewing(row.viewing.id, { reminderSentAt: new Date() });
      sent += 1;
    }
  }
  return { due: rows.length, sent };
}
