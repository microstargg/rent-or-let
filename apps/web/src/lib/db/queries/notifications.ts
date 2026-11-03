import { and, asc, count, desc, eq, inArray, isNull, ne, type SQL } from "drizzle-orm";
import { getTenant } from "@repo/config/server";
import { db } from "../index";
import { agencyEq, currentAgencyId, ensureAgency } from "../agency-scope";
import {
  complianceItems,
  notifications,
  properties,
  staffProfiles,
  tasks,
  tickets,
  workOrders,
} from "../schema";
import { getAppUrl } from "@/lib/app-url";
import { isOutboundEmailConfigured, sendEmail } from "@/lib/email/send";
import { renderNotificationEmail } from "@/lib/notifications/email-template";
import {
  parseNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notifications/preferences";
import { createUnsubscribeToken } from "@/lib/notifications/unsubscribe-token";

export type NotificationType =
  | "job_assigned"
  | "task_assigned"
  | "task_due"
  | "compliance_expiring"
  | "compliance_expired"
  | "emergency_ticket"
  | "new_application";

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body?: string | null;
  /** App path, e.g. /jobs/board?view=mine */
  href?: string | null;
  /** Same key for the same person is only stored once. */
  dedupeKey?: string | null;
}

export interface StaffRecipient {
  id: string;
  email: string;
  fullName: string;
  role: string;
  prefs: NotificationPrefs;
}

export async function listStaffRecipients(): Promise<StaffRecipient[]> {
  await ensureAgency();
  const rows = await db
    .select()
    .from(staffProfiles)
    .where(agencyEq(staffProfiles.agencyId))
    .orderBy(asc(staffProfiles.fullName));
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    fullName: r.fullName,
    role: r.role,
    prefs: parseNotificationPrefs(r.notificationPrefs),
  }));
}

/** Short list for assignee pickers. */
export async function listAssignableStaff() {
  const staff = await listStaffRecipients();
  return staff.map((s) => ({ id: s.id, name: s.fullName || s.email, email: s.email }));
}

export function settingsUrl(): string {
  return `${getAppUrl()}/settings/notifications`;
}

export function unsubscribeUrlFor(staffId: string): string | null {
  const token = createUnsubscribeToken(currentAgencyId(), staffId);
  return token ? `${getAppUrl()}/api/notifications/unsubscribe?token=${encodeURIComponent(token)}` : null;
}

async function sendInstantEmail(staff: StaffRecipient, n: NotificationInput): Promise<boolean> {
  const appUrl = getAppUrl();
  const agencyName = getTenant().name;
  const unsubscribeUrl = unsubscribeUrlFor(staff.id);
  const { html, text } = renderNotificationEmail({
    agencyName,
    heading: n.title,
    intro: n.body ?? undefined,
    sections: [],
    cta: n.href ? { label: "Open in Let Flow", href: `${appUrl}${n.href}` } : undefined,
    settingsUrl: settingsUrl(),
    unsubscribeUrl,
  });
  const result = await sendEmail({
    to: staff.email,
    subject: n.title,
    text,
    html,
    replyTo: getTenant().site.contact.email || undefined,
    headers: unsubscribeUrl
      ? {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : undefined,
  });
  if (!result.ok) console.warn("[notifications] instant email not sent:", result.error);
  return result.ok;
}

/**
 * Store a notification for each person (skipping duplicates by dedupe key) and,
 * when `instantEmail` is set, email the people who keep instant emails switched on.
 * Never throws: a notification must not break the action that caused it.
 */
export async function notify(
  staffIds: string[],
  n: NotificationInput,
  opts: { instantEmail?: boolean; skipStaffId?: string | null } = {}
): Promise<number> {
  try {
    await ensureAgency();
    const ids = [...new Set(staffIds)].filter((id) => id && id !== opts.skipStaffId);
    if (!ids.length) return 0;

    const inserted = await db
      .insert(notifications)
      .values(
        ids.map((staffId) => ({
          agencyId: currentAgencyId(),
          staffId,
          type: n.type,
          title: n.title,
          body: n.body ?? null,
          href: n.href ?? null,
          dedupeKey: n.dedupeKey ?? null,
        }))
      )
      .onConflictDoNothing()
      .returning({ id: notifications.id, staffId: notifications.staffId });

    if (opts.instantEmail && inserted.length && isOutboundEmailConfigured()) {
      const staff = await listStaffRecipients();
      for (const row of inserted) {
        const person = staff.find((s) => s.id === row.staffId);
        if (!person?.email || !person.prefs.instantEmail) continue;
        if (await sendInstantEmail(person, n)) {
          await db
            .update(notifications)
            .set({ emailedAt: new Date() })
            .where(and(eq(notifications.id, row.id), agencyEq(notifications.agencyId)));
        }
      }
    }
    return inserted.length;
  } catch (err) {
    console.error("[notifications] notify failed", err);
    return 0;
  }
}

/** Notify everyone, or only admins, in the current agency. */
export async function notifyStaff(
  audience: "everyone" | "admins",
  n: NotificationInput,
  opts: { instantEmail?: boolean; skipStaffId?: string | null } = {}
): Promise<number> {
  try {
    const staff = await listStaffRecipients();
    const admins = staff.filter((s) => s.role === "admin");
    // An agency with no admin marked still needs someone to hear about it.
    const targets = audience === "admins" && admins.length ? admins : staff;
    return notify(
      targets.map((s) => s.id),
      n,
      opts
    );
  } catch (err) {
    console.error("[notifications] notifyStaff failed", err);
    return 0;
  }
}

export async function listNotificationsForStaff(staffId: string, limit = 30) {
  await ensureAgency();
  return db
    .select()
    .from(notifications)
    .where(and(agencyEq(notifications.agencyId), eq(notifications.staffId, staffId)))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadNotifications(staffId: string) {
  await ensureAgency();
  const [r] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        agencyEq(notifications.agencyId),
        eq(notifications.staffId, staffId),
        isNull(notifications.readAt)
      )
    );
  return r?.value ?? 0;
}

export async function markNotificationsRead(staffId: string, ids?: string[]) {
  await ensureAgency();
  const conditions: SQL[] = [
    agencyEq(notifications.agencyId),
    eq(notifications.staffId, staffId),
    isNull(notifications.readAt),
  ];
  if (ids?.length) conditions.push(inArray(notifications.id, ids));
  await db.update(notifications).set({ readAt: new Date() }).where(and(...conditions));
}

export async function getStaffNotificationPrefs(staffId: string): Promise<NotificationPrefs> {
  await ensureAgency();
  const [row] = await db
    .select({ prefs: staffProfiles.notificationPrefs })
    .from(staffProfiles)
    .where(and(agencyEq(staffProfiles.agencyId), eq(staffProfiles.id, staffId)))
    .limit(1);
  return parseNotificationPrefs(row?.prefs);
}

export async function updateStaffNotificationPrefs(staffId: string, prefs: Partial<NotificationPrefs>) {
  const current = await getStaffNotificationPrefs(staffId);
  const next = parseNotificationPrefs({ ...current, ...prefs });
  await db
    .update(staffProfiles)
    .set({ notificationPrefs: next })
    .where(and(agencyEq(staffProfiles.agencyId), eq(staffProfiles.id, staffId)));
  return next;
}

// ---------------------------------------------------------------------------
// Jobs board: staff assignment on work orders
// ---------------------------------------------------------------------------

export async function assignWorkOrder(
  workOrderId: string,
  assigneeStaffId: string | null,
  actorStaffId?: string | null
) {
  await ensureAgency();
  const [row] = await db
    .update(workOrders)
    .set({ assigneeStaffId })
    .where(and(eq(workOrders.id, workOrderId), agencyEq(workOrders.agencyId)))
    .returning();
  if (row && assigneeStaffId) {
    await notifyJobAssigned(row.id, assigneeStaffId, actorStaffId);
  }
  return row ?? null;
}

export async function notifyJobAssigned(
  workOrderId: string,
  assigneeStaffId: string,
  actorStaffId?: string | null
) {
  const [job] = await db
    .select({
      summary: tickets.summary,
      address: properties.displayAddress,
      scheduledFor: workOrders.scheduledFor,
    })
    .from(workOrders)
    .innerJoin(tickets, eq(workOrders.ticketId, tickets.id))
    .innerJoin(properties, eq(tickets.propertyId, properties.id))
    .where(and(eq(workOrders.id, workOrderId), agencyEq(workOrders.agencyId)))
    .limit(1);
  if (!job) return;
  const when = job.scheduledFor
    ? ` on ${new Date(job.scheduledFor).toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short" })}`
    : "";
  await notify(
    [assigneeStaffId],
    {
      type: "job_assigned",
      title: `Job assigned to you: ${job.summary}`,
      body: `${job.address}${when}`,
      href: "/jobs/board?view=mine",
      dedupeKey: `job-assigned:${workOrderId}:${assigneeStaffId}`,
    },
    { instantEmail: true, skipStaffId: actorStaffId }
  );
}

// ---------------------------------------------------------------------------
// Tasks (office jobs) on the jobs board
// ---------------------------------------------------------------------------

export async function listBoardTasks(branchId: string, opts: { includeDone?: boolean } = {}) {
  await ensureAgency();
  const conditions: SQL[] = [agencyEq(tasks.agencyId), eq(tasks.branchId, branchId)];
  if (!opts.includeDone) conditions.push(ne(tasks.status, "done"));
  const rows = await db
    .select({
      task: tasks,
      complianceType: complianceItems.type,
      compliancePropertyId: complianceItems.propertyId,
      propertyAddress: properties.displayAddress,
    })
    .from(tasks)
    .leftJoin(
      complianceItems,
      and(eq(tasks.relatedType, "compliance_item"), eq(tasks.relatedId, complianceItems.id))
    )
    .leftJoin(properties, eq(complianceItems.propertyId, properties.id))
    .where(and(...conditions))
    .orderBy(asc(tasks.dueAt), desc(tasks.createdAt));
  return rows.map((r) => ({
    ...r,
    href: taskHref(r.task.relatedType, r.task.relatedId, r.compliancePropertyId),
  }));
}

export function taskHref(
  relatedType: string | null,
  relatedId: string | null,
  compliancePropertyId?: string | null
): string | null {
  if (!relatedType || !relatedId) return null;
  switch (relatedType) {
    case "compliance_item":
      return compliancePropertyId ? `/properties/${compliancePropertyId}` : "/compliance";
    case "property":
      return `/properties/${relatedId}`;
    case "ticket":
      return `/tickets/${relatedId}`;
    case "tenancy":
      return "/tenancies";
    default:
      return null;
  }
}

export async function createBoardTask(
  data: {
    branchId: string;
    title: string;
    notes?: string | null;
    dueAt?: Date | null;
    assigneeStaffId?: string | null;
    relatedType?: string | null;
    relatedId?: string | null;
  },
  actorStaffId?: string | null
) {
  await ensureAgency();
  const [row] = await db
    .insert(tasks)
    .values({
      agencyId: currentAgencyId(),
      branchId: data.branchId,
      title: data.title,
      notes: data.notes ?? null,
      dueAt: data.dueAt ?? null,
      assigneeStaffId: data.assigneeStaffId ?? null,
      relatedType: data.relatedType ?? null,
      relatedId: data.relatedId ?? null,
      meta: actorStaffId ? { created_by: actorStaffId } : {},
    })
    .returning();
  if (row?.assigneeStaffId) await notifyTaskAssigned(row, actorStaffId);
  return row;
}

async function notifyTaskAssigned(
  task: typeof tasks.$inferSelect,
  actorStaffId?: string | null
) {
  if (!task.assigneeStaffId) return;
  const due = task.dueAt
    ? `Due ${new Date(task.dueAt).toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short" })}`
    : null;
  await notify(
    [task.assigneeStaffId],
    {
      type: "task_assigned",
      title: `Task for you: ${task.title}`,
      body: due,
      href: "/jobs/board?view=mine",
      dedupeKey: `task-assigned:${task.id}:${task.assigneeStaffId}`,
    },
    { skipStaffId: actorStaffId }
  );
}

export async function updateBoardTask(
  id: string,
  data: Partial<{
    title: string;
    notes: string | null;
    dueAt: Date | null;
    status: "open" | "done";
    assigneeStaffId: string | null;
  }>,
  actorStaffId?: string | null
) {
  await ensureAgency();
  const [before] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), agencyEq(tasks.agencyId)))
    .limit(1);
  if (!before) return null;

  const patch: Partial<typeof tasks.$inferInsert> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.dueAt !== undefined) patch.dueAt = data.dueAt;
  if (data.assigneeStaffId !== undefined) patch.assigneeStaffId = data.assigneeStaffId;
  if (data.status !== undefined) {
    patch.status = data.status;
    patch.completedAt = data.status === "done" ? new Date() : null;
  }
  if (!Object.keys(patch).length) return before;

  const [row] = await db
    .update(tasks)
    .set(patch)
    .where(and(eq(tasks.id, id), agencyEq(tasks.agencyId)))
    .returning();

  if (row?.assigneeStaffId && row.assigneeStaffId !== before.assigneeStaffId) {
    await notifyTaskAssigned(row, actorStaffId);
  }
  return row ?? null;
}
