import { Resend } from "resend";
import { siteContent } from "@/lib/content/site";

let client: Resend | null = null;

export function isOutboundEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && getFromAddress());
}

function getFromAddress(): string | null {
  const explicit = process.env.RESEND_FROM_EMAIL?.trim();
  if (explicit) return explicit;
  const domain = process.env.RESEND_INBOUND_DOMAIN?.trim();
  if (domain) return `noreply@${domain}`;
  return null;
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export interface SendEmailResult {
  sent: boolean;
  id?: string;
  reason?: "not_configured" | "send_failed";
  error?: string;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<SendEmailResult> {
  const from = getFromAddress();
  const resend = getResend();
  if (!resend || !from) {
    console.log("[email] skipped — not configured", { to: params.to, subject: params.subject });
    return { sent: false, reason: "not_configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${siteContent.contact.address.line1} <${from}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html ?? `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(params.text)}</pre>`,
    });
    if (error) {
      console.error("[email] send failed", error);
      return { sent: false, reason: "send_failed", error: error.message };
    }
    return { sent: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] send threw", message);
    return { sent: false, reason: "send_failed", error: message };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendPortalInviteEmail(params: {
  to: string;
  inviteUrl: string;
  role: "renter" | "landlord" | "staff";
}): Promise<SendEmailResult> {
  const roleLabel =
    params.role === "renter" ? "tenant" : params.role === "landlord" ? "landlord" : "staff";
  const subject = `Your ${roleLabel} portal invite — ${siteContent.contact.address.line1}`;
  const text = [
    `Hello,`,
    ``,
    `You have been invited to the ${roleLabel} portal for ${siteContent.contact.address.line1}.`,
    ``,
    `Open this link to accept (expires soon):`,
    params.inviteUrl,
    ``,
    `If you did not expect this email, you can ignore it.`,
    ``,
    siteContent.contact.address.line1,
    siteContent.contact.phone,
  ].join("\n");

  return sendEmail({ to: params.to, subject, text });
}

export async function sendContractorJobEmail(params: {
  to: string;
  name: string;
  subject: string;
  body: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: params.to,
    subject: params.subject,
    text: params.body,
  });
}
