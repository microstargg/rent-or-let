import { createHmac, timingSafeEqual } from "crypto";

function secret(): string | null {
  return (
    process.env.NOTIFICATIONS_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    null
  );
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** Signed token for the one-click unsubscribe link in notification emails. */
export function createUnsubscribeToken(agencySlug: string, staffId: string): string | null {
  const key = secret();
  if (!key) return null;
  const payload = Buffer.from(JSON.stringify({ a: agencySlug, s: staffId })).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function readUnsubscribeToken(token: string): { agencySlug: string; staffId: string } | null {
  const key = secret();
  if (!key) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { a?: string; s?: string };
    if (typeof data.a !== "string" || typeof data.s !== "string") return null;
    return { agencySlug: data.a, staffId: data.s };
  } catch {
    return null;
  }
}
