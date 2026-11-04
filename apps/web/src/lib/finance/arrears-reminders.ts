import { getTenant } from "@repo/config/server";
import { getBranchWithSettings, createTask, listArrears } from "@/lib/db/queries";
import { listTenancyContacts, setTenancyJson } from "@/lib/db/queries/tenancy";
import { getClientAccountDetails } from "@/lib/branch-settings";
import { getPaymentRefFromMetadata } from "@/lib/payment-ref";
import { isOutboundEmailConfigured, sendEmail } from "@/lib/email/send";
import { sendSms } from "@/lib/sms/send";
import {
  nextReminderStage,
  parsePaymentPlan,
  planProgress,
  REMINDER_STAGES,
  type ReminderState,
} from "./arrears";

function ukDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC" });
}

/**
 * Daily: email (and text, if switched on) tenants whose rent is overdue, at 3, 10
 * and 21 days. Tenancies keeping to a payment plan are left alone. Off unless the
 * agency turns it on in Settings.
 */
export async function sendArrearsReminders(branchId: string, now = new Date()) {
  const branch = await getBranchWithSettings(branchId);
  const settings = branch?.settings ?? {};
  if (!settings.arrears_reminders?.enabled) return { skipped: "off" as const, sent: 0 };
  // Without email nothing would go out, and recording stages would skip them once email works.
  if (!isOutboundEmailConfigured()) return { skipped: "email not configured" as const, sent: 0 };

  const account = getClientAccountDetails(settings);
  const payTo = account.accountNumber
    ? `${account.name ?? "our client account"} (sort code ${account.sortCode ?? "?"}, account ${account.accountNumber})`
    : "our usual account";
  const agency = getTenant().name;
  const rows = await listArrears(branchId);
  let sent = 0;

  for (const row of rows) {
    if (!row.oldestDue) continue;
    const { tenancy, contacts } = await listTenancyContacts(row.tenancyId);
    if (!tenancy) continue;
    const plan = parsePaymentPlan(tenancy.paymentPlan);
    if (plan?.status === "active" && planProgress(plan, row.balance, now).onTrack) continue;

    const state = (tenancy.arrearsReminders ?? null) as ReminderState | null;
    const stage = nextReminderStage(row.daysOverdue, row.oldestDue, state);
    if (!stage) continue;

    const ref = getPaymentRefFromMetadata(tenancy.metadata);
    for (const c of contacts) {
      const text = {
        name: c.name,
        balance: row.balance.toFixed(2),
        address: row.propertyAddress,
        dueDate: ukDate(row.oldestDue),
        payTo,
        ref,
        agency,
      };
      if (c.email) {
        const r = await sendEmail({ to: c.email, subject: stage.subject, text: stage.text(text) });
        if (r.ok) sent += 1;
      }
      if (settings.arrears_reminders?.sms && c.phone) {
        const r = await sendSms(c.phone, stage.sms(text));
        if (r.ok) sent += 1;
      }
    }

    const previous = state && state.oldestDue === row.oldestDue ? state.sent : [];
    // Mark every stage up to this one, so a late switch-on doesn't send three at once later.
    const done = REMINDER_STAGES.filter((s) => s.day <= stage.day).map((s) => s.day);
    await setTenancyJson(row.tenancyId, "arrearsReminders", {
      oldestDue: row.oldestDue,
      sent: [...new Set([...previous, ...done])],
      lastSentAt: now.toISOString(),
    });

    if (stage.day === REMINDER_STAGES[REMINDER_STAGES.length - 1]!.day) {
      await createTask({
        branchId,
        title: `Call tenant: ${row.propertyAddress} is £${row.balance.toFixed(2)} in arrears`,
        relatedType: "tenancy",
        relatedId: row.tenancyId,
        dueAt: now,
      });
    }
  }
  return { sent };
}
