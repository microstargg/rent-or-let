import { Resend } from "resend";
import { getTenant } from "@repo/config/server";
import { inDemoAgency } from "@/lib/demo/server";

export function isOutboundEmailConfigured(): boolean {
  if (inDemoAgency()) return false;
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendPlainEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (inDemoAgency()) return { ok: false, error: "Emails are switched off in the demo." };
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "Email is not configured (RESEND_API_KEY)" };

  const from =
    process.env.RESEND_FROM?.trim() ||
    `${getTenant().name} <${getTenant().site.contact.email}>`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
