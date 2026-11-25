/** Arrears payment plans and the automatic reminder schedule. */

export interface PaymentPlan {
  /** Overdue balance when the plan was agreed. */
  arrearsAtStart: number;
  /** Extra paid each month on top of the normal rent. */
  instalment: number;
  /** First instalment date (ISO). Later ones fall on the same day each month. */
  startDate: string;
  status: "active" | "completed" | "cancelled";
  agreedAt: string;
  notes?: string;
}

export function parsePaymentPlan(raw: unknown): PaymentPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<PaymentPlan>;
  if (!p.startDate || !(Number(p.instalment) > 0)) return null;
  return {
    arrearsAtStart: Number(p.arrearsAtStart) || 0,
    instalment: Number(p.instalment),
    startDate: p.startDate,
    status: p.status ?? "active",
    agreedAt: p.agreedAt ?? p.startDate,
    notes: p.notes,
  };
}

/** Instalments that have fallen due by `now`, counting the first one on startDate. */
export function instalmentsDue(plan: PaymentPlan, now: Date): number {
  const start = new Date(`${plan.startDate}T00:00:00Z`);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (today < start.getTime()) return 0;
  let months =
    (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + (now.getUTCMonth() - start.getUTCMonth());
  if (now.getUTCDate() >= start.getUTCDate()) months += 1;
  const max = Math.ceil(plan.arrearsAtStart / plan.instalment);
  return Math.min(Math.max(months, 0), max);
}

export interface PlanProgress {
  expectedBalance: number;
  actualBalance: number;
  onTrack: boolean;
  monthsLeft: number;
}

/** On track while the overdue balance is no higher than the plan says it should be (with £1 slack). */
export function planProgress(plan: PaymentPlan, overdueNow: number, now: Date): PlanProgress {
  const due = instalmentsDue(plan, now);
  const expectedBalance = Math.max(0, plan.arrearsAtStart - due * plan.instalment);
  const monthsLeft = Math.max(0, Math.ceil(plan.arrearsAtStart / plan.instalment) - due);
  return {
    expectedBalance: Math.round(expectedBalance * 100) / 100,
    actualBalance: Math.round(overdueNow * 100) / 100,
    onTrack: overdueNow <= expectedBalance + 1,
    monthsLeft,
  };
}

/** Days overdue at which tenants get a reminder, and what it says. */
export const REMINDER_STAGES = [
  {
    day: 3,
    subject: "Your rent is overdue",
    text: (o: ReminderText) =>
      `Hi ${o.name},\n\nWe haven't received £${o.balance} rent for ${o.address}, which was due on ${o.dueDate}. If you've already paid, thank you and please ignore this.\n\nPlease pay to ${o.payTo}${o.ref ? ` using reference ${o.ref}` : ""}, or get in touch if you're having trouble paying.\n\n${o.agency}`,
    sms: (o: ReminderText) => `${o.agency}: rent of £${o.balance} for ${o.address} is overdue. Please pay${o.ref ? ` using ref ${o.ref}` : ""} or call us if you need help.`,
  },
  {
    day: 10,
    subject: "Second reminder: rent overdue",
    text: (o: ReminderText) =>
      `Hi ${o.name},\n\n£${o.balance} rent for ${o.address} is still outstanding (due ${o.dueDate}). Please pay as soon as you can${o.ref ? ` using reference ${o.ref}` : ""}.\n\nIf you're struggling, please call or reply so we can agree a payment plan. Interest can be charged on rent more than 14 days late.\n\n${o.agency}`,
    sms: (o: ReminderText) => `${o.agency}: £${o.balance} rent for ${o.address} is still unpaid. Please pay or contact us to agree a plan.`,
  },
  {
    day: 21,
    subject: "Rent arrears: please contact us",
    text: (o: ReminderText) =>
      `Hi ${o.name},\n\nYour rent account for ${o.address} is £${o.balance} in arrears. Please contact us within 7 days to pay or agree a payment plan.\n\nFree, confidential debt advice is available from Citizens Advice and StepChange.\n\n${o.agency}`,
    sms: (o: ReminderText) => `${o.agency}: your rent account for ${o.address} is £${o.balance} in arrears. Please contact us within 7 days.`,
  },
] as const;

export interface ReminderText {
  name: string;
  balance: string;
  address: string;
  dueDate: string;
  payTo: string;
  ref: string | null;
  agency: string;
}

export interface ReminderState {
  /** The oldest unpaid due date these reminders are about; a new one resets the stages. */
  oldestDue: string;
  sent: number[];
  lastSentAt?: string;
}

/** The highest stage reached that hasn't been sent yet for this run of arrears. */
export function nextReminderStage(
  daysOverdue: number,
  oldestDue: string,
  state: ReminderState | null
): (typeof REMINDER_STAGES)[number] | null {
  const sent = state && state.oldestDue === oldestDue ? state.sent : [];
  const reached = REMINDER_STAGES.filter((s) => daysOverdue >= s.day);
  const latest = reached[reached.length - 1];
  if (!latest || sent.includes(latest.day)) return null;
  return latest;
}
