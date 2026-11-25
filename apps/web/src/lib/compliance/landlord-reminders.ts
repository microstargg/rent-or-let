import { getTenant } from "@repo/config/server";
import { getBranchWithSettings } from "@/lib/db/queries";
import { listLandlords } from "@/lib/db/queries/operations";
import { listBranchRequirements, mergeComplianceItemMeta } from "@/lib/db/queries/compliance";
import { isOutboundEmailConfigured, sendEmail } from "@/lib/email/send";
import { getAppUrl } from "@/lib/app-url";
import { complianceLabel } from "@/lib/portal-format";
import type { Requirement } from "./requirements";
import { dueReminderStage, stagesCoveredBy, ukDate, type ReminderStage } from "./reminder-stages";

function lineFor(r: Requirement & { propertyAddress: string }) {
  const label = complianceLabel(r.type);
  const who = r.responsible === "landlord" ? " (you arrange this)" : "";
  if (!r.item) return `- ${label}${who}: ${r.dueDate ? `due by ${ukDate(r.dueDate)}` : "not on file yet"}`;
  if (!r.item.expiresAt) return `- ${label}${who}: ${r.status === "missing" ? "not on file yet" : "on file"}`;
  const verb = r.status === "expired" ? "expired" : "expires";
  return `- ${label}${who}: ${verb} ${ukDate(r.item.expiresAt)}`;
}

/**
 * Daily: email each landlord when a certificate on their property is 60, 30 or
 * 7 days from expiry or has expired, and on the 1st of the month send a summary
 * of everything not up to date. Off unless the agency turns it on in Settings.
 */
export async function sendLandlordComplianceReminders(branchId: string, now = new Date()) {
  const branch = await getBranchWithSettings(branchId);
  if (!branch?.settings.landlord_compliance_emails) return { skipped: "off" as const, sent: 0 };
  if (!isOutboundEmailConfigured()) return { skipped: "email not configured" as const, sent: 0 };

  const monthly = now.getUTCDate() === 1;
  const [landlordRows, requirementRows] = await Promise.all([
    listLandlords(branchId),
    listBranchRequirements(branchId),
  ]);
  const agency = getTenant().name;
  const portal = `${getAppUrl()}/landlord-portal/compliance`;
  let sent = 0;

  for (const landlord of landlordRows) {
    if (!landlord.email) continue;
    const mine = requirementRows
      .filter((row) => row.property.landlordId === landlord.id)
      .flatMap((row) =>
        row.requirements.map((r) => ({ ...r, propertyAddress: row.property.displayAddress }))
      );
    if (!mine.length) continue;

    const due: { req: (typeof mine)[number]; stage: ReminderStage }[] = [];
    for (const r of mine) {
      if (!r.item) continue;
      const meta = (r.item.meta ?? {}) as Record<string, unknown>;
      const sentStages = Array.isArray(meta.landlordReminders) ? (meta.landlordReminders as string[]) : [];
      const stage = dueReminderStage(r.item.expiresAt, sentStages, now);
      if (stage) due.push({ req: r, stage });
    }
    const outstanding = mine.filter((r) => r.status !== "valid");
    if (!due.length && !(monthly && outstanding.length)) continue;

    const byProperty = (rows: typeof mine) => {
      const groups = new Map<string, string[]>();
      for (const r of rows) groups.set(r.propertyAddress, [...(groups.get(r.propertyAddress) ?? []), lineFor(r)]);
      return [...groups].map(([address, lines]) => `${address}\n${lines.join("\n")}`).join("\n\n");
    };

    const sections: string[] = [];
    if (due.length) {
      sections.push(`Coming up or overdue:\n\n${byProperty(due.map((d) => d.req))}`);
    }
    if (monthly && outstanding.length) {
      sections.push(`Everything not up to date this month:\n\n${byProperty(outstanding)}`);
    }

    const subject = due.length
      ? `${due.length} compliance item${due.length === 1 ? "" : "s"} need attention on your properties`
      : "Your monthly compliance summary";
    const text = [
      `Hello ${landlord.firstName},`,
      "",
      `Here is where compliance stands on your properties with ${agency}.`,
      "",
      sections.join("\n\n"),
      "",
      `Unless it says "you arrange this", we'll handle it and update your portal when it's done.`,
      `See everything, including certificates, at ${portal}`,
      "",
      agency,
    ].join("\n");

    const result = await sendEmail({ to: landlord.email, subject, text });
    if (!result.ok) {
      console.error(`[landlord-reminders] ${landlord.id}: ${result.error}`);
      continue;
    }
    sent += 1;
    for (const { req, stage } of due) {
      const meta = (req.item!.meta ?? {}) as Record<string, unknown>;
      const prior = Array.isArray(meta.landlordReminders) ? (meta.landlordReminders as string[]) : [];
      await mergeComplianceItemMeta(req.item!.id, {
        landlordReminders: [...new Set([...prior, ...stagesCoveredBy(stage)])],
      });
    }
  }
  return { sent };
}
