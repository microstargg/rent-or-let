import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencyEq, ensureAgency } from "@/lib/db/agency-scope";
import { enquiries, properties, tenantApplications } from "@/lib/db/schema";
import { countByStatus, listArrears, listPaymentExceptions } from "@/lib/db/queries";
import { listViewingDiary, viewingContact } from "@/lib/db/queries/viewings";
import { loadDigestContext } from "@/lib/notifications/digest";
import { londonDateKey } from "@/lib/notifications/preferences";

/** How many rows each dashboard list shows before "See all". */
export const DASHBOARD_LIST_LIMIT = 5;

async function listNewEnquiries(limit: number) {
  await ensureAgency();
  return db
    .select({
      id: enquiries.id,
      name: enquiries.name,
      createdAt: enquiries.createdAt,
      propertyAddress: properties.displayAddress,
    })
    .from(enquiries)
    .leftJoin(properties, eq(enquiries.propertyId, properties.id))
    .where(and(agencyEq(enquiries.agencyId), eq(enquiries.status, "new")))
    .orderBy(desc(enquiries.createdAt))
    .limit(limit);
}

async function listSubmittedApplications(limit: number) {
  await ensureAgency();
  return db
    .select({
      id: tenantApplications.id,
      firstName: tenantApplications.firstName,
      lastName: tenantApplications.lastName,
      createdAt: tenantApplications.createdAt,
      propertyAddress: properties.displayAddress,
    })
    .from(tenantApplications)
    .leftJoin(properties, eq(tenantApplications.propertyId, properties.id))
    .where(and(agencyEq(tenantApplications.agencyId), eq(tenantApplications.status, "submitted")))
    .orderBy(desc(tenantApplications.createdAt))
    .limit(limit);
}

/**
 * Everything the staff dashboard shows, for one branch and the signed-in person.
 * "Your day" uses the same rules as the morning email (lib/notifications/digest.ts),
 * so the page and the email always agree.
 */
export async function loadDashboard(branchId: string, staffId: string | null, now = new Date()) {
  const today = londonDateKey(now);
  const [
    digest,
    arrears,
    exceptions,
    diary,
    newEnquiries,
    newEnquiryCount,
    applications,
    applicationCount,
    openComplaints,
    failedSyncs,
  ] = await Promise.all([
    loadDigestContext(branchId),
    listArrears(branchId),
    listPaymentExceptions(branchId, "open"),
    listViewingDiary(branchId, now),
    listNewEnquiries(DASHBOARD_LIST_LIMIT),
    countByStatus("enquiries", "new"),
    listSubmittedApplications(DASHBOARD_LIST_LIMIT),
    countByStatus("tenant_applications", "submitted"),
    countByStatus("complaints", "open"),
    countByStatus("portal_sync_logs", "failed"),
  ]);

  const dueByToday = (d: Date | string | null) => Boolean(d) && londonDateKey(new Date(d!)) <= today;
  const isToday = (d: Date | string | null) => Boolean(d) && londonDateKey(new Date(d!)) === today;

  const myJobs = staffId
    ? digest.jobs.filter((j) => j.assigneeStaffId === staffId && dueByToday(j.scheduledFor))
    : [];
  const myTasks = staffId
    ? digest.tasks.filter((t) => t.task.assigneeStaffId === staffId && dueByToday(t.task.dueAt))
    : [];
  const unassignedTasks = digest.tasks.filter(
    (t) => !t.task.assigneeStaffId && t.task.relatedType !== "compliance_item" && dueByToday(t.task.dueAt)
  );
  const viewingsToday = diary
    .filter((v) => isToday(v.viewing.scheduledAt))
    .map((v) => ({ ...v, contact: viewingContact(v) }));

  return {
    today,
    isToday,
    myJobs,
    myTasks,
    viewingsToday,
    unassignedTasks,
    arrears,
    arrearsTotal: arrears.reduce((sum, r) => sum + r.balance, 0),
    arrearsSevere: arrears.filter((r) => r.daysOverdue >= 14).length,
    certificates: digest.certificates,
    certificatesExpired: digest.certificates.filter((c) => c.status === "expired").length,
    hazards: digest.hazards,
    overdueInspections: digest.overdueInspections,
    exceptions,
    newEnquiries,
    newEnquiryCount,
    applications,
    applicationCount,
    openComplaints,
    failedSyncs,
  };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
