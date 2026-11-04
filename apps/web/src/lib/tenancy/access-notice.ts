import { getTenant } from "@repo/config/server";
import { sendEmail } from "@/lib/email/send";
import { isSmsConfigured, sendSms, toUkMobile } from "@/lib/sms/send";
import { listTenancyContacts } from "@/lib/db/queries/tenancy";
import { getTenancyById } from "@/lib/db/queries";
import { ACCESS_NOTICE_HOURS, accessNotice } from "@/lib/lettings/viewings";

/** Written notice of a visit to every tenant on the tenancy, by email and text where we can. */
export async function sendAccessNotice(tenancyId: string, at: Date, purpose: string) {
  const [{ contacts }, tenancy] = await Promise.all([listTenancyContacts(tenancyId), getTenancyById(tenancyId)]);
  const address = tenancy?.property.displayAddress ?? "your home";
  const hoursAhead = (at.getTime() - Date.now()) / 3_600_000;
  const warning =
    hoursAhead < ACCESS_NOTICE_HOURS
      ? `This is less than ${ACCESS_NOTICE_HOURS} hours away, so the tenant needs to agree to the visit.`
      : null;
  let emailed = 0;
  let texted = 0;
  const errors: string[] = [];
  for (const c of contacts) {
    const msg = accessNotice({ name: c.name, address, at, purpose, agency: getTenant().name });
    if (c.email) {
      const r = await sendEmail({ to: c.email, subject: msg.subject, text: msg.text });
      if (r.ok) emailed += 1;
      else errors.push(r.error);
    }
    if (isSmsConfigured() && toUkMobile(c.phone)) {
      const r = await sendSms(c.phone!, msg.sms);
      if (r.ok) texted += 1;
      else errors.push(r.error);
    }
  }
  return { emailed, texted, warning, errors: [...new Set(errors)] };
}
