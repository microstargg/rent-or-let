import { getAgencyBySlug, runWithAgencyAsync } from "@repo/config/server";
import { updateStaffNotificationPrefs } from "@/lib/db/queries/notifications";
import { readUnsubscribeToken } from "@/lib/notifications/unsubscribe-token";

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;color:#111827;">
<main style="max-width:480px;margin:64px auto;padding:32px;background:#fff;border-radius:12px;">
<h1 style="font-size:20px;margin:0 0 12px;">${title}</h1><p style="line-height:1.5;color:#374151;margin:0;">${body}</p></main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function unsubscribe(token: string | null): Promise<boolean> {
  const data = token ? readUnsubscribeToken(token) : null;
  if (!data) return false;
  let agency;
  try {
    agency = getAgencyBySlug(data.agencySlug);
  } catch {
    return false;
  }
  await runWithAgencyAsync(agency, () =>
    updateStaffNotificationPrefs(data.staffId, { digest: "off", instantEmail: false })
  );
  return true;
}

/** Link in the email footer. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!(await unsubscribe(token))) {
    return page("Link not recognised", "This unsubscribe link is not valid. You can change your emails in Settings, Notifications.", 400);
  }
  return page(
    "You're unsubscribed",
    "You won't get the morning email or instant emails any more. Notifications still appear in the bell inside Let Flow, and you can switch emails back on in Settings, Notifications."
  );
}

/** One-click unsubscribe from mail clients (RFC 8058). */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const ok = await unsubscribe(token);
  return new Response(null, { status: ok ? 200 : 400 });
}
