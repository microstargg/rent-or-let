import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import { getTenant } from "@repo/config/server";
import { db } from "@/lib/db";
import { agencyEq, ensureAgency } from "@/lib/db/agency-scope";
import { complianceItems, properties, tickets, workOrders } from "@/lib/db/schema";
import {
  listBoardTasks,
  listStaffRecipients,
  notify,
  settingsUrl,
  unsubscribeUrlFor,
  type StaffRecipient,
} from "@/lib/db/queries/notifications";
import { getBranchWithSettings, listOverdueInspections, listOverduePetRequests } from "@/lib/db/queries";
import { getAppUrl } from "@/lib/app-url";
import { listOpenHazardTickets } from "@/lib/db/queries/tickets";
import { hazardForTicket, nextHazardStep } from "@/lib/tickets/hazard";
import { isOutboundEmailConfigured, sendEmail } from "@/lib/email/send";
import { renderNotificationEmail, type EmailSection } from "./email-template";
import { digestDueToday, londonDateKey, type ComplianceAlertAudience } from "./preferences";

const MAX_CERTIFICATES = 8;
const MAX_OTHER = 5;

function shortDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function prettyType(t: string): string {
  const s = t.replaceAll("_", " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Everything the morning email needs for one branch, loaded once for all staff. */
export async function loadDigestContext(branchId: string) {
  await ensureAgency();
  const [staff, tasks, jobs, certificates, overdueInspections, overduePets, branch, hazardRows] = await Promise.all([
    listStaffRecipients(),
    listBoardTasks(branchId),
    db
      .select({
        id: workOrders.id,
        assigneeStaffId: workOrders.assigneeStaffId,
        scheduledFor: workOrders.scheduledFor,
        status: workOrders.status,
        summary: tickets.summary,
        address: properties.displayAddress,
      })
      .from(workOrders)
      .innerJoin(tickets, eq(workOrders.ticketId, tickets.id))
      .innerJoin(properties, eq(tickets.propertyId, properties.id))
      .where(
        and(
          agencyEq(workOrders.agencyId),
          eq(workOrders.branchId, branchId),
          notInArray(workOrders.status, ["completed", "cancelled"])
        )
      )
      .orderBy(asc(workOrders.scheduledFor)),
    db
      .select({
        id: complianceItems.id,
        type: complianceItems.type,
        status: complianceItems.status,
        expiresAt: complianceItems.expiresAt,
        propertyId: complianceItems.propertyId,
        address: properties.displayAddress,
      })
      .from(complianceItems)
      .innerJoin(properties, eq(complianceItems.propertyId, properties.id))
      .where(
        and(
          agencyEq(complianceItems.agencyId),
          eq(complianceItems.branchId, branchId),
          inArray(complianceItems.status, ["expiring", "expired"])
        )
      )
      .orderBy(asc(complianceItems.expiresAt)),
    listOverdueInspections(branchId),
    listOverduePetRequests(branchId),
    getBranchWithSettings(branchId),
    listOpenHazardTickets(branchId),
  ]);
  const now = new Date();
  const hazards = hazardRows
    .map(({ ticket, propertyAddress }) => {
      const h = hazardForTicket(ticket);
      const step = h ? nextHazardStep(h, now) : null;
      return step && (step.state === "overdue" || step.state === "due_soon")
        ? { id: ticket.id, summary: ticket.summary, address: propertyAddress, step }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => (a.step.dueAt?.getTime() ?? 0) - (b.step.dueAt?.getTime() ?? 0));
  const audience: ComplianceAlertAudience =
    branch?.settings.compliance_alerts === "everyone" ? "everyone" : "admins";
  return {
    staff,
    tasks,
    jobs,
    certificates,
    overdueInspections,
    overduePets,
    hazards,
    audience,
    alertEmail: branch?.settings.alert_email ?? null,
  };
}

export type DigestContext = Awaited<ReturnType<typeof loadDigestContext>>;

/** Does this person get certificate / inspection / pet request alerts? */
export function receivesComplianceAlerts(ctx: DigestContext, person: Pick<StaffRecipient, "role"> | null): boolean {
  if (!person) return true; // the fallback alert address
  if (ctx.audience === "everyone") return true;
  const hasAdmins = ctx.staff.some((s) => s.role === "admin");
  return person.role === "admin" || !hasAdmins;
}

export interface Digest {
  subject: string;
  heading: string;
  intro: string;
  sections: EmailSection[];
}

/**
 * The morning email for one person, or null when there is nothing for them today.
 * `person` null builds the compliance-only version for the agency's fallback address.
 */
export function buildDigest(ctx: DigestContext, person: StaffRecipient | null, now = new Date()): Digest | null {
  const appUrl = getAppUrl();
  const today = londonDateKey(now);
  const sections: EmailSection[] = [];
  const counts: string[] = [];

  if (person) {
    const myJobs = ctx.jobs.filter(
      (j) => j.assigneeStaffId === person.id && j.scheduledFor && londonDateKey(j.scheduledFor) <= today
    );
    if (myJobs.length) {
      sections.push({
        title: "Your jobs",
        items: myJobs.map((j) => {
          const day = londonDateKey(j.scheduledFor!);
          return {
            label: j.summary,
            detail: `${j.address} · ${day === today ? "Today" : `Overdue, was ${shortDate(j.scheduledFor!)}`}`,
            href: `${appUrl}/jobs/board?view=mine`,
          };
        }),
      });
      counts.push(`${myJobs.length} job${myJobs.length === 1 ? "" : "s"}`);
    }

    const myTasks = ctx.tasks.filter(
      (t) => t.task.assigneeStaffId === person.id && t.task.dueAt && londonDateKey(t.task.dueAt) <= today
    );
    if (myTasks.length) {
      sections.push({
        title: "Your tasks",
        items: myTasks.map((t) => {
          const day = londonDateKey(t.task.dueAt!);
          return {
            label: t.task.title,
            detail: day === today ? "Due today" : `Overdue, was due ${shortDate(t.task.dueAt!)}`,
            href: `${appUrl}${t.href ?? "/jobs/board?view=mine"}`,
          };
        }),
      });
      counts.push(`${myTasks.length} task${myTasks.length === 1 ? "" : "s"}`);
    }
  }

  if (receivesComplianceAlerts(ctx, person)) {
    // Unassigned office tasks that are due, except certificate tasks (listed below).
    const unassigned = ctx.tasks.filter(
      (t) =>
        !t.task.assigneeStaffId &&
        t.task.relatedType !== "compliance_item" &&
        t.task.dueAt &&
        londonDateKey(t.task.dueAt) <= today
    );
    if (unassigned.length) {
      sections.push({
        title: "Unassigned tasks due",
        items: unassigned.slice(0, MAX_OTHER).map((t) => ({
          label: t.task.title,
          detail: `Due ${shortDate(t.task.dueAt!)}`,
          href: `${appUrl}/jobs/board?view=unassigned`,
        })),
        ...(unassigned.length > MAX_OTHER
          ? { moreHref: `${appUrl}/jobs/board?view=unassigned`, moreLabel: `See all ${unassigned.length}` }
          : {}),
      });
    }

    if (ctx.certificates.length) {
      const expired = ctx.certificates.filter((c) => c.status === "expired").length;
      sections.push({
        title: "Certificates",
        items: ctx.certificates.slice(0, MAX_CERTIFICATES).map((c) => ({
          label: `${prettyType(c.type)}: ${c.address}`,
          detail:
            c.status === "expired"
              ? `Expired${c.expiresAt ? ` ${shortDate(c.expiresAt)}` : ""}`
              : `Expires ${c.expiresAt ? shortDate(c.expiresAt) : "soon"}`,
          href: `${appUrl}/properties/${c.propertyId}`,
        })),
        ...(ctx.certificates.length > MAX_CERTIFICATES
          ? { moreHref: `${appUrl}/compliance`, moreLabel: `See all ${ctx.certificates.length}` }
          : {}),
      });
      counts.push(expired ? `${expired} expired certificate${expired === 1 ? "" : "s"}` : `${ctx.certificates.length} certificate${ctx.certificates.length === 1 ? "" : "s"} expiring`);
    }

    if (ctx.hazards.length) {
      sections.push({
        title: "Hazard deadlines (damp and mould)",
        items: ctx.hazards.slice(0, MAX_OTHER).map((h) => ({
          label: `${h.summary}: ${h.address}`,
          detail: `${h.step.label} · ${h.step.state === "overdue" ? "overdue since" : "due"} ${shortDate(h.step.dueAt!)}`,
          href: `${appUrl}/tickets/${h.id}`,
        })),
        ...(ctx.hazards.length > MAX_OTHER
          ? { moreHref: `${appUrl}/tickets`, moreLabel: `See all ${ctx.hazards.length}` }
          : {}),
      });
      const overdue = ctx.hazards.filter((h) => h.step.state === "overdue").length;
      counts.push(overdue ? `${overdue} hazard deadline${overdue === 1 ? "" : "s"} missed` : `${ctx.hazards.length} hazard deadline${ctx.hazards.length === 1 ? "" : "s"} due`);
    }

    if (ctx.overdueInspections.length) {
      sections.push({
        title: "Overdue inspections",
        items: ctx.overdueInspections.slice(0, MAX_OTHER).map((i) => ({
          label: i.propertyAddress,
          detail: `${prettyType(i.inspection.type)}${i.inspection.scheduledAt ? ` · was ${shortDate(i.inspection.scheduledAt)}` : ""}`,
          href: `${appUrl}/inspections/${i.inspection.id}`,
        })),
        ...(ctx.overdueInspections.length > MAX_OTHER
          ? { moreHref: `${appUrl}/inspections`, moreLabel: `See all ${ctx.overdueInspections.length}` }
          : {}),
      });
      counts.push(`${ctx.overdueInspections.length} overdue inspection${ctx.overdueInspections.length === 1 ? "" : "s"}`);
    }

    if (ctx.overduePets.length) {
      sections.push({
        title: "Overdue pet requests",
        items: ctx.overduePets.slice(0, MAX_OTHER).map((p) => ({
          label: p.propertyAddress,
          detail: `${p.request.petDescription} · reply was due ${shortDate(p.request.dueAt)}`,
          href: `${appUrl}/pets`,
        })),
      });
      counts.push(`${ctx.overduePets.length} pet request${ctx.overduePets.length === 1 ? "" : "s"}`);
    }
  }

  if (!sections.length) return null;

  const firstName = person?.fullName?.split(" ")[0];
  const dateLabel = now.toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return {
    subject: `Today: ${counts.slice(0, 3).join(", ") || "things to check"}`,
    heading: firstName ? `Good morning, ${firstName}` : "Good morning",
    intro: `Here is what needs attention today, ${dateLabel}.`,
    sections,
  };
}

export function renderDigest(digest: Digest, staffId: string | null) {
  return renderNotificationEmail({
    agencyName: getTenant().name,
    heading: digest.heading,
    intro: digest.intro,
    sections: digest.sections,
    cta: { label: "Open the jobs board", href: `${getAppUrl()}/jobs/board?view=mine` },
    settingsUrl: settingsUrl(),
    unsubscribeUrl: staffId ? unsubscribeUrlFor(staffId) : null,
  });
}

/**
 * Daily job for one branch (called from the 07:00 cron inside the agency context):
 * in-app notifications for new certificate problems and tasks due today, then the
 * morning email to everyone whose preference says today.
 */
export async function runDailyNotifications(
  branchId: string,
  changedCompliance: {
    id: string;
    propertyId: string;
    type: string;
    status: "expiring" | "expired";
    expiresAt: string | null;
  }[],
  now = new Date()
) {
  const ctx = await loadDigestContext(branchId);
  const today = londonDateKey(now);
  let inApp = 0;

  // Certificates that just turned expiring / expired.
  const complianceRecipients = ctx.staff.filter((s) => receivesComplianceAlerts(ctx, s)).map((s) => s.id);
  for (const c of changedCompliance) {
    const cert = ctx.certificates.find((x) => x.id === c.id);
    inApp += await notify(complianceRecipients, {
      type: c.status === "expired" ? "compliance_expired" : "compliance_expiring",
      title: `${c.status === "expired" ? "Certificate expired" : "Certificate expiring"}: ${prettyType(c.type)}`,
      body: [cert?.address, c.expiresAt ? `${c.status === "expired" ? "Expired" : "Expires"} ${shortDate(c.expiresAt)}` : null]
        .filter(Boolean)
        .join(" · "),
      href: `/properties/${c.propertyId}`,
      dedupeKey: `compliance:${c.id}:${c.status}`,
    });
  }

  // Hazard steps that have just gone overdue.
  for (const h of ctx.hazards) {
    if (h.step.state !== "overdue") continue;
    inApp += await notify(complianceRecipients, {
      type: "hazard_overdue",
      title: `Hazard deadline missed: ${h.step.label}`,
      body: `${h.summary} · ${h.address}`,
      href: `/tickets/${h.id}`,
      dedupeKey: `hazard:${h.id}:${h.step.key}`,
    });
  }

  // Tasks due today, for the person they are assigned to.
  for (const t of ctx.tasks) {
    if (!t.task.assigneeStaffId || !t.task.dueAt || londonDateKey(t.task.dueAt) !== today) continue;
    inApp += await notify([t.task.assigneeStaffId], {
      type: "task_due",
      title: `Due today: ${t.task.title}`,
      href: t.href ?? "/jobs/board?view=mine",
      dedupeKey: `task-due:${t.task.id}:${today}`,
    });
  }

  // Morning emails (not on the demo, or before Resend is set up).
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];
  if (!isOutboundEmailConfigured()) {
    return { inApp, sent, skipped: ctx.staff.length, errors, email: "not configured" as const };
  }
  for (const person of ctx.staff) {
    if (!person.email || !digestDueToday(person.prefs.digest, now)) {
      skipped += 1;
      continue;
    }
    const digest = buildDigest(ctx, person, now);
    if (!digest) {
      skipped += 1;
      continue;
    }
    const { html, text } = renderDigest(digest, person.id);
    const unsubscribeUrl = unsubscribeUrlFor(person.id);
    const result = await sendEmail({
      to: person.email,
      subject: digest.subject,
      text,
      html,
      replyTo: getTenant().site.contact.email || undefined,
      headers: unsubscribeUrl
        ? { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
        : undefined,
    });
    if (result.ok) sent += 1;
    else errors.push(`${person.email}: ${result.error}`);
  }

  // No staff set up yet: keep the old behaviour of alerting the fallback address.
  if (!ctx.staff.length && ctx.alertEmail && digestDueToday("weekdays", now)) {
    const digest = buildDigest(ctx, null, now);
    if (digest) {
      const { html, text } = renderDigest(digest, null);
      const result = await sendEmail({ to: ctx.alertEmail, subject: digest.subject, text, html });
      if (result.ok) sent += 1;
      else errors.push(`${ctx.alertEmail}: ${result.error}`);
    }
  }

  return { inApp, sent, skipped, errors: errors.slice(0, 5) };
}
