import { inDemoAgency } from "@/lib/demo/server";

/**
 * Text messages through Twilio's REST API (no SDK). Needs TWILIO_ACCOUNT_SID,
 * TWILIO_AUTH_TOKEN and TWILIO_FROM (a number or alphanumeric sender ID).
 */
export function isSmsConfigured(): boolean {
  if (inDemoAgency()) return false;
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM?.trim()
  );
}

/** UK mobile numbers to E.164 (+447…). Returns null for anything that isn't a mobile. */
export function toUkMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  let n = digits;
  if (n.startsWith("+44")) n = `0${n.slice(3)}`;
  else if (n.startsWith("44")) n = `0${n.slice(2)}`;
  if (!/^07\d{9}$/.test(n)) return null;
  return `+44${n.slice(1)}`;
}

export async function sendSms(to: string, body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (inDemoAgency()) return { ok: false, error: "Texts are switched off in the demo." };
  if (!isSmsConfigured()) return { ok: false, error: "SMS is not configured (TWILIO_*)" };
  const number = toUkMobile(to) ?? (to.startsWith("+") ? to : null);
  if (!number) return { ok: false, error: "Not a mobile number" };
  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: number, From: process.env.TWILIO_FROM!.trim(), Body: body.slice(0, 600) }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: data.message ?? `Twilio error ${res.status}` };
  }
  return { ok: true };
}
