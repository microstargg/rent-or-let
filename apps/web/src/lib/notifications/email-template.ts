/** Plain, table-based HTML that renders in Outlook and Gmail alike. No external assets. */

export interface EmailItem {
  label: string;
  detail?: string;
  href?: string;
}

export interface EmailSection {
  title: string;
  items: EmailItem[];
  /** Shown under the list when it was cut short. */
  moreHref?: string;
  moreLabel?: string;
}

export interface NotificationEmail {
  agencyName: string;
  heading: string;
  intro?: string;
  sections: EmailSection[];
  cta?: { label: string; href: string };
  settingsUrl: string;
  unsubscribeUrl?: string | null;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderNotificationEmail(e: NotificationEmail): { html: string; text: string } {
  const font = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

  const sectionsHtml = e.sections
    .map((s) => {
      const rows = s.items
        .map((item) => {
          const label = item.href
            ? `<a href="${esc(item.href)}" style="color:#111827;text-decoration:none;font-weight:600;">${esc(item.label)}</a>`
            : `<span style="font-weight:600;">${esc(item.label)}</span>`;
          const detail = item.detail
            ? `<div style="color:#6b7280;font-size:13px;margin-top:2px;">${esc(item.detail)}</div>`
            : "";
          return `<tr><td style="padding:10px 0;border-top:1px solid #e5e7eb;${font}font-size:14px;color:#111827;">${label}${detail}</td></tr>`;
        })
        .join("");
      const more = s.moreHref
        ? `<tr><td style="padding:8px 0 0;${font}font-size:13px;"><a href="${esc(s.moreHref)}" style="color:#2563eb;">${esc(s.moreLabel ?? "See all")}</a></td></tr>`
        : "";
      return `<tr><td style="padding:20px 0 4px;${font}font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#374151;">${esc(s.title)} <span style="color:#9ca3af;font-weight:500;">${s.items.length}</span></td></tr>${rows}${more}`;
    })
    .join("");

  const cta = e.cta
    ? `<tr><td style="padding:24px 0 8px;"><a href="${esc(e.cta.href)}" style="display:inline-block;background:#111827;color:#ffffff;${font}font-size:14px;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:8px;">${esc(e.cta.label)}</a></td></tr>`
    : "";

  const unsubscribe = e.unsubscribeUrl
    ? ` · <a href="${esc(e.unsubscribeUrl)}" style="color:#6b7280;">Unsubscribe</a>`
    : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(e.heading)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;"><tr><td style="padding:28px 28px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="${font}font-size:13px;color:#6b7280;">${esc(e.agencyName)}</td></tr>
<tr><td style="padding-top:6px;${font}font-size:22px;font-weight:700;color:#111827;">${esc(e.heading)}</td></tr>
${e.intro ? `<tr><td style="padding-top:8px;${font}font-size:14px;line-height:1.5;color:#374151;">${esc(e.intro)}</td></tr>` : ""}
${sectionsHtml}
${cta}
</table></td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;"><tr><td style="padding:16px 8px;${font}font-size:12px;color:#6b7280;text-align:center;">
Sent by Let Flow for ${esc(e.agencyName)} · <a href="${esc(e.settingsUrl)}" style="color:#6b7280;">Notification settings</a>${unsubscribe}
</td></tr></table>
</td></tr></table></body></html>`;

  const textParts = [e.heading, e.intro ?? ""];
  for (const s of e.sections) {
    textParts.push(`\n${s.title.toUpperCase()} (${s.items.length})`);
    for (const item of s.items) {
      textParts.push(`- ${item.label}${item.detail ? ` (${item.detail})` : ""}${item.href ? `\n  ${item.href}` : ""}`);
    }
    if (s.moreHref) textParts.push(`  ${s.moreLabel ?? "See all"}: ${s.moreHref}`);
  }
  if (e.cta) textParts.push(`\n${e.cta.label}: ${e.cta.href}`);
  textParts.push(`\nNotification settings: ${e.settingsUrl}`);
  if (e.unsubscribeUrl) textParts.push(`Unsubscribe: ${e.unsubscribeUrl}`);

  return { html, text: textParts.filter((p) => p !== "").join("\n") };
}
