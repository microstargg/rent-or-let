import { getAppUrl } from "@/lib/app-url";
import { siteContent } from "@/lib/content/site";
import { sendPlainEmail } from "@/lib/email/send";
import { statementPortalLoginUrl } from "@/lib/finance/statement-format";
import {
  getLandlordById,
  getLandlordProfileByLandlordId,
  getLandlordStatementForDownload,
  issueLandlordPortalInvite,
} from "@/lib/db/queries";

export async function emailLandlordStatement(opts: {
  branchId: string;
  statementId: string;
}): Promise<{ ok: true; to: string } | { ok: false; error: string }> {
  const row = await getLandlordStatementForDownload(opts.statementId);
  if (!row || row.statement.branchId !== opts.branchId) {
    return { ok: false, error: "Statement not found" };
  }

  const landlord = await getLandlordById(row.statement.landlordId);
  if (!landlord?.email) {
    return { ok: false, error: "Landlord needs an email address" };
  }

  const name = `${landlord.firstName} ${landlord.lastName}`.trim() || "Landlord";
  const period = `${row.statement.periodFrom} to ${row.statement.periodTo}`;
  const portalUrl = statementPortalLoginUrl(getAppUrl(), row.statement.id);
  const profile = await getLandlordProfileByLandlordId(landlord.id);

  let inviteLine = "";
  if (!profile) {
    const issued = await issueLandlordPortalInvite({
      branchId: opts.branchId,
      landlordId: landlord.id,
      email: landlord.email,
    });
    inviteLine = `\n\nThis is your first time using the portal. Accept your invite first:\n${issued.url}\nThen sign in to view statements.`;
  }

  const agency = siteContent.contact.address.line1;
  const text = [
    `Hello ${name},`,
    ``,
    `Your landlord statement for ${period} is ready.`,
    `Sign in to view and download it here:`,
    portalUrl,
    inviteLine,
    ``,
    `If you have any questions, call ${siteContent.contact.phone} or email ${siteContent.contact.email}.`,
    ``,
    agency,
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  const sent = await sendPlainEmail({
    to: landlord.email,
    subject: `Your landlord statement (${period})`,
    text,
  });
  if (!sent.ok) return sent;
  return { ok: true, to: landlord.email };
}
