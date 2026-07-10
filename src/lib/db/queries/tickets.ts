import { eq, and, desc, count, notInArray, or, ilike, type SQL } from "drizzle-orm";
import { db } from "../index";
import {
  tickets,
  ticketMessages,
  workOrders,
  contractors,
  properties,
  tenancies,
  branches,
} from "../schema";
import { parseBranchSettings } from "@/lib/branch-settings";

export const TICKET_LIST_PAGE_SIZE = 50;

export async function listTickets(branchId?: string) {
  const base = db
    .select({
      ticket: tickets,
      propertyAddress: properties.displayAddress,
    })
    .from(tickets)
    .innerJoin(properties, eq(tickets.propertyId, properties.id));

  if (branchId) {
    return base.where(eq(tickets.branchId, branchId)).orderBy(desc(tickets.createdAt));
  }
  return base.orderBy(desc(tickets.createdAt));
}

export async function searchTickets(opts: {
  branchId?: string;
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const pageSize = opts.pageSize ?? TICKET_LIST_PAGE_SIZE;
  const page = Math.max(1, opts.page ?? 1);
  const offset = (page - 1) * pageSize;
  const conditions: SQL[] = [];

  if (opts.branchId) conditions.push(eq(tickets.branchId, opts.branchId));
  if (opts.status && opts.status !== "all") {
    conditions.push(eq(tickets.status, opts.status));
  }
  if (opts.q?.trim()) {
    const pattern = `%${opts.q.trim()}%`;
    conditions.push(
      or(
        ilike(tickets.summary, pattern),
        ilike(tickets.description, pattern),
        ilike(properties.displayAddress, pattern),
        ilike(properties.postcode, pattern)
      )!
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, totalRow, openRow] = await Promise.all([
    db
      .select({
        ticket: tickets,
        propertyAddress: properties.displayAddress,
      })
      .from(tickets)
      .innerJoin(properties, eq(tickets.propertyId, properties.id))
      .where(where)
      .orderBy(desc(tickets.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(tickets)
      .innerJoin(properties, eq(tickets.propertyId, properties.id))
      .where(where),
    db
      .select({ total: count() })
      .from(tickets)
      .where(
        and(
          ...(opts.branchId ? [eq(tickets.branchId, opts.branchId)] : []),
          notInArray(tickets.status, ["completed", "cancelled"])
        )
      ),
  ]);

  return {
    rows,
    total: totalRow[0]?.total ?? 0,
    openCount: openRow[0]?.total ?? 0,
  };
}

export async function getTicketById(id: string) {
  const [row] = await db
    .select({
      ticket: tickets,
      propertyAddress: properties.displayAddress,
    })
    .from(tickets)
    .innerJoin(properties, eq(tickets.propertyId, properties.id))
    .where(eq(tickets.id, id))
    .limit(1);
  return row ?? null;
}

export async function listTicketsForRenter(branchId: string, renterId: string) {
  return db
    .select({ ticket: tickets, propertyAddress: properties.displayAddress })
    .from(tickets)
    .innerJoin(properties, eq(tickets.propertyId, properties.id))
    .innerJoin(tenancies, eq(tickets.tenancyId, tenancies.id))
    .where(and(eq(tickets.branchId, branchId), eq(tenancies.primaryRenterId, renterId)))
    .orderBy(desc(tickets.createdAt));
}

export async function getTicketForRenter(ticketId: string, branchId: string, renterId: string) {
  const [row] = await db
    .select({ ticket: tickets })
    .from(tickets)
    .innerJoin(tenancies, eq(tickets.tenancyId, tenancies.id))
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.branchId, branchId),
        eq(tenancies.primaryRenterId, renterId)
      )
    )
    .limit(1);
  return row?.ticket ?? null;
}

export async function createTicket(data: {
  branchId: string;
  propertyId: string;
  tenancyId?: string | null;
  reportedByType: string;
  reportedById?: string | null;
  source: string;
  summary: string;
  description?: string | null;
  locationArea?: string | null;
  category?: string | null;
  priority?: string | null;
  isEmergency?: boolean;
}) {
  const [row] = await db
    .insert(tickets)
    .values({
      branchId: data.branchId,
      propertyId: data.propertyId,
      tenancyId: data.tenancyId,
      reportedByType: data.reportedByType,
      reportedById: data.reportedById,
      source: data.source,
      summary: data.summary,
      description: data.description,
      locationArea: data.locationArea,
      category: data.category,
      priority: data.priority,
      isEmergency: data.isEmergency ?? false,
      status: "new",
    })
    .returning();
  return row;
}

export async function updateTicketStatus(id: string, status: string) {
  await db
    .update(tickets)
    .set({ status, updatedAt: new Date() })
    .where(eq(tickets.id, id));
}

export async function listTicketMessages(ticketId: string) {
  return db
    .select()
    .from(ticketMessages)
    .where(eq(ticketMessages.ticketId, ticketId))
    .orderBy(ticketMessages.createdAt);
}

export async function addTicketMessage(data: {
  branchId: string;
  ticketId: string;
  senderType: string;
  senderId?: string | null;
  channel?: string;
  body: string;
}) {
  await db.insert(ticketMessages).values({
    branchId: data.branchId,
    ticketId: data.ticketId,
    senderType: data.senderType,
    senderId: data.senderId,
    channel: data.channel ?? "portal",
    body: data.body,
  });
  await db
    .update(tickets)
    .set({ updatedAt: new Date() })
    .where(eq(tickets.id, data.ticketId));
}

export async function listWorkOrders(opts?: { branchId?: string; ticketId?: string }) {
  const base = db
    .select({
      workOrder: workOrders,
      contractorName: contractors.name,
      ticketSummary: tickets.summary,
      propertyAddress: properties.displayAddress,
    })
    .from(workOrders)
    .innerJoin(tickets, eq(workOrders.ticketId, tickets.id))
    .innerJoin(properties, eq(tickets.propertyId, properties.id))
    .leftJoin(contractors, eq(workOrders.contractorId, contractors.id));

  if (opts?.ticketId) {
    return base.where(eq(workOrders.ticketId, opts.ticketId)).orderBy(desc(workOrders.createdAt));
  }
  if (opts?.branchId) {
    return base.where(eq(workOrders.branchId, opts.branchId)).orderBy(desc(workOrders.createdAt));
  }
  return base.orderBy(desc(workOrders.createdAt));
}

export async function createWorkOrder(data: {
  branchId: string;
  ticketId: string;
  contractorId?: string | null;
  scheduledFor?: Date | null;
  status?: string;
  costEstimate?: number | null;
}) {
  const [row] = await db
    .insert(workOrders)
    .values({
      branchId: data.branchId,
      ticketId: data.ticketId,
      contractorId: data.contractorId,
      scheduledFor: data.scheduledFor,
      status: data.status ?? "draft",
      costEstimate: data.costEstimate != null ? String(data.costEstimate) : null,
    })
    .returning();
  return row;
}

export async function updateWorkOrder(
  id: string,
  data: Partial<{
    contractorId: string | null;
    scheduledFor: Date | null;
    status: string;
    costEstimate: number | null;
    finalCost: number | null;
  }>
) {
  const [existing] = await db.select().from(workOrders).where(eq(workOrders.id, id)).limit(1);
  if (!existing) return null;

  const [branch] = await db.select().from(branches).where(eq(branches.id, existing.branchId)).limit(1);
  const settings = parseBranchSettings(branch?.settings);
  const threshold = settings.work_order_approval_threshold ?? 250;

  let nextStatus = data.status;
  const estimate =
    data.costEstimate !== undefined
      ? data.costEstimate
      : existing.costEstimate != null
        ? Number(existing.costEstimate)
        : null;

  const existingMeta =
    typeof existing.meta === "object" && existing.meta
      ? (existing.meta as Record<string, unknown>)
      : {};
  const wasApproved =
    existing.status === "approved" || existingMeta.approved === true;

  if (
    nextStatus === "completed" &&
    estimate != null &&
    estimate > threshold &&
    !wasApproved &&
    existing.status !== "completed"
  ) {
    nextStatus = "awaiting_approval";
  }

  if (data.costEstimate != null && data.costEstimate > threshold && !nextStatus && !wasApproved) {
    nextStatus = "awaiting_approval";
  }

  const newMeta = { ...existingMeta };
  if (nextStatus === "approved") newMeta.approved = true;

  await db
    .update(workOrders)
    .set({
      ...(data.contractorId !== undefined && { contractorId: data.contractorId }),
      ...(data.scheduledFor !== undefined && { scheduledFor: data.scheduledFor }),
      ...(nextStatus && { status: nextStatus }),
      ...(data.costEstimate !== undefined && {
        costEstimate: data.costEstimate != null ? String(data.costEstimate) : null,
      }),
      ...(data.finalCost !== undefined && {
        finalCost: data.finalCost != null ? String(data.finalCost) : null,
      }),
      meta: newMeta,
    })
    .where(eq(workOrders.id, id));

  const [updated] = await db.select().from(workOrders).where(eq(workOrders.id, id)).limit(1);

  // Notify contractor on assign
  const contractorId = data.contractorId !== undefined ? data.contractorId : existing.contractorId;
  if (contractorId && (data.contractorId || data.scheduledFor || data.status === "assigned")) {
    await notifyContractorOfJob(updated!);
  }

  // Post cost on completion
  if (updated?.status === "completed" && updated.finalCost && existing.status !== "completed") {
    await postCompletedWorkOrderCost(updated);
  }

  return { workOrder: updated, blockedForApproval: nextStatus === "awaiting_approval" };
}

async function notifyContractorOfJob(wo: typeof workOrders.$inferSelect) {
  if (!wo.contractorId) return { sent: false, reason: "no-contractor" as const };
  const [contractor] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.id, wo.contractorId))
    .limit(1);
  if (!contractor?.email) {
    console.log("[maintenance] contractor notify skipped — no email", wo.id);
    return { sent: false, reason: "no-email" as const };
  }

  const ticket = await getTicketById(wo.ticketId);
  const subject = `Job assigned: ${ticket?.ticket.summary ?? wo.ticketId}`;
  const body = [
    `Hello ${contractor.name},`,
    ``,
    `You have been assigned a maintenance job.`,
    `Property: ${ticket?.propertyAddress ?? "—"}`,
    `Summary: ${ticket?.ticket.summary ?? "—"}`,
    `Scheduled: ${wo.scheduledFor ? wo.scheduledFor.toISOString() : "TBC"}`,
    `Estimate: ${wo.costEstimate ?? "TBC"}`,
  ].join("\n");

  // Log notification; Resend outbound optional
  console.log("[maintenance] contractor notify", { to: contractor.email, subject });
  await db
    .update(workOrders)
    .set({
      meta: {
        ...(typeof wo.meta === "object" && wo.meta ? wo.meta : {}),
        last_contractor_notify: {
          at: new Date().toISOString(),
          email: contractor.email,
          subject,
          body,
        },
      },
    })
    .where(eq(workOrders.id, wo.id));

  return { sent: true, email: contractor.email, subject, body };
}

async function postCompletedWorkOrderCost(wo: typeof workOrders.$inferSelect) {
  const ticket = await getTicketById(wo.ticketId);
  if (!ticket) return;
  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, ticket.ticket.propertyId))
    .limit(1);
  if (!prop?.landlordId || !wo.finalCost) return;

  const { postWorkOrderCostToLandlord } = await import("./landlord-finance");
  const meta = typeof wo.meta === "object" && wo.meta ? (wo.meta as Record<string, unknown>) : {};
  if (meta.cost_posted) return;

  await postWorkOrderCostToLandlord({
    branchId: wo.branchId,
    landlordId: prop.landlordId,
    propertyId: prop.id,
    tenancyId: ticket.ticket.tenancyId,
    workOrderId: wo.id,
    amount: Number(wo.finalCost),
  });

  await db
    .update(workOrders)
    .set({ meta: { ...meta, cost_posted: true } })
    .where(eq(workOrders.id, wo.id));
}

export async function approveWorkOrder(id: string) {
  return updateWorkOrder(id, { status: "approved" });
}

export async function completeWorkOrder(id: string, finalCost: number) {
  return updateWorkOrder(id, { status: "completed", finalCost });
}

export async function attachDocumentToTicket(data: {
  branchId: string;
  ticketId: string;
  url: string;
  filename?: string;
  kind?: string;
}) {
  const { createDocument } = await import("./compliance");
  return createDocument({
    branchId: data.branchId,
    entityType: "ticket",
    entityId: data.ticketId,
    kind: data.kind ?? "photo",
    url: data.url,
    filename: data.filename,
  });
}


export async function listContractors(branchId: string) {
  return db
    .select()
    .from(contractors)
    .where(eq(contractors.branchId, branchId))
    .orderBy(contractors.name);
}

export async function createContractor(data: {
  branchId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  trade?: string | null;
  notes?: string | null;
}) {
  const [row] = await db.insert(contractors).values(data).returning();
  return row;
}

export async function deleteContractor(id: string) {
  await db.delete(contractors).where(eq(contractors.id, id));
}

export async function countOpenTickets(branchId: string) {
  const [r] = await db
    .select({ value: count() })
    .from(tickets)
    .where(
      and(eq(tickets.branchId, branchId), notInArray(tickets.status, ["completed", "cancelled"]))
    );
  return r?.value ?? 0;
}

export async function findBranchByMaintenanceToken(token: string) {
  const allBranches = await db.select().from(branches);
  for (const branch of allBranches) {
    const settings = parseBranchSettings(branch.settings);
    if (settings.maintenance_inbox_token === token) {
      return branch;
    }
  }
  return null;
}
