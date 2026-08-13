import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, properties, tickets, workOrders } from "@/lib/db/schema";
import { postWorkOrderCostToLandlord } from "@/lib/db/queries/landlord-finance";
import {
  WORKS_INVOICE_BILLED,
  WORKS_INVOICE_PENDING,
  WORKS_INVOICE_TYPE,
} from "./constants";

export {
  WORKS_INVOICE_BILLED,
  WORKS_INVOICE_PENDING,
  WORKS_INVOICE_TYPE,
  isTenantPayableInvoiceType,
  isWorksInvoiceType,
} from "./constants";

export function workOrderChargeDate(wo: { scheduledFor: Date | null }): string {
  if (wo.scheduledFor) return wo.scheduledFor.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

export function workOrderInvoiceAmount(wo: {
  finalCost: string | null;
  costEstimate: string | null;
}): number {
  const final = wo.finalCost != null ? Number(wo.finalCost) : NaN;
  if (Number.isFinite(final) && final > 0) return Math.round(final * 100) / 100;
  const estimate = wo.costEstimate != null ? Number(wo.costEstimate) : NaN;
  if (Number.isFinite(estimate) && estimate > 0) return Math.round(estimate * 100) / 100;
  return 0;
}

export function workOrderOccurredAt(dueDate: string): Date {
  return new Date(`${dueDate}T12:00:00.000Z`);
}

function workOrderMeta(
  existing: Record<string, unknown>,
  extra: Record<string, unknown>
): Record<string, unknown> {
  return { ...existing, ...extra };
}

export async function getInvoiceForWorkOrder(workOrderId: string) {
  const [row] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.workOrderId, workOrderId))
    .limit(1);
  return row ?? null;
}

/**
 * Create or refresh a landlord works invoice for a completed job only.
 * Dated to the scheduled work date so it falls on the matching statement period.
 */
export async function upsertWorkOrderInvoice(wo: typeof workOrders.$inferSelect) {
  if (wo.status !== "completed") {
    return getInvoiceForWorkOrder(wo.id);
  }

  const amount = workOrderInvoiceAmount(wo);
  if (amount <= 0) return null;

  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, wo.ticketId)).limit(1);
  if (!ticket) return null;

  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, ticket.propertyId))
    .limit(1);
  if (!property) return null;

  const dueDate = workOrderChargeDate(wo);
  const existing = await getInvoiceForWorkOrder(wo.id);
  const existingMeta =
    existing && typeof existing.meta === "object" && existing.meta
      ? (existing.meta as Record<string, unknown>)
      : {};
  const meta = workOrderMeta(existingMeta, {
    work_order_id: wo.id,
    ticket_id: ticket.id,
    ticket_summary: ticket.summary,
    property_address: property.displayAddress,
  });

  if (existing) {
    const billed = existing.status === WORKS_INVOICE_BILLED;
    const [updated] = await db
      .update(invoices)
      .set({
        amount: String(amount),
        dueDate,
        propertyId: property.id,
        landlordId: property.landlordId,
        tenancyId: ticket.tenancyId,
        meta,
        ...(!billed ? { status: WORKS_INVOICE_PENDING } : {}),
      })
      .where(eq(invoices.id, existing.id))
      .returning();
    return updated ?? existing;
  }

  const [created] = await db
    .insert(invoices)
    .values({
      branchId: wo.branchId,
      tenancyId: ticket.tenancyId,
      propertyId: property.id,
      landlordId: property.landlordId,
      workOrderId: wo.id,
      type: WORKS_INVOICE_TYPE,
      dueDate,
      amount: String(amount),
      status: WORKS_INVOICE_PENDING,
      meta,
    })
    .returning();
  return created ?? null;
}

export async function postCompletedWorkOrderCost(wo: typeof workOrders.$inferSelect) {
  if (wo.status !== "completed") return null;

  const invoice = await upsertWorkOrderInvoice(wo);
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, wo.ticketId)).limit(1);
  if (!ticket) return null;

  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, ticket.propertyId))
    .limit(1);
  if (!property?.landlordId) return invoice;

  const amount = workOrderInvoiceAmount(wo);
  if (amount <= 0) return invoice;

  const [fresh] = await db.select().from(workOrders).where(eq(workOrders.id, wo.id)).limit(1);
  const current = fresh ?? wo;
  const woMeta =
    typeof current.meta === "object" && current.meta
      ? (current.meta as Record<string, unknown>)
      : {};
  if (woMeta.cost_posted) return invoice;

  const dueDate = invoice?.dueDate ?? workOrderChargeDate(wo);
  await postWorkOrderCostToLandlord({
    branchId: wo.branchId,
    landlordId: property.landlordId,
    propertyId: property.id,
    tenancyId: ticket.tenancyId,
    workOrderId: wo.id,
    invoiceId: invoice?.id ?? null,
    amount,
    memo: ticket.summary ? `Works: ${ticket.summary}` : "Maintenance cost",
    occurredAt: workOrderOccurredAt(dueDate),
  });

  await db
    .update(workOrders)
    .set({ meta: { ...woMeta, cost_posted: true, invoice_id: invoice?.id ?? null } })
    .where(eq(workOrders.id, wo.id));

  return invoice;
}

/**
 * Safety net: completed jobs dated on or before the statement period that were
 * never posted to the landlord ledger are charged when statements are generated.
 */
export async function chargeUnbilledWorkInvoicesForPeriod(
  branchId: string,
  to: string
) {
  const rows = await db
    .select({ workOrder: workOrders })
    .from(invoices)
    .innerJoin(workOrders, eq(invoices.workOrderId, workOrders.id))
    .where(
      and(
        eq(invoices.branchId, branchId),
        eq(invoices.type, WORKS_INVOICE_TYPE),
        inArray(invoices.status, [WORKS_INVOICE_PENDING, "due"]),
        lte(invoices.dueDate, to),
        eq(workOrders.status, "completed")
      )
    );

  for (const { workOrder } of rows) {
    await postCompletedWorkOrderCost(workOrder);
  }
}
