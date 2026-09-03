import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contractors,
  invoices,
  landlords,
  properties,
  tenancies,
  tickets,
  workOrders,
} from "@/lib/db/schema";
import { ensureJobInvoiceSchema } from "@/lib/db/ensure-schema";
import { postCompletedWorkOrderCost } from "./work-order-invoice";

export const DEMO_WORK_INVOICE_SEED = "demo-work-invoices-v1";

function demoId(n: number): string {
  return `d0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

export const DEMO_LANDLORD_ID = demoId(1);
export const DEMO_CONTRACTOR_ID = demoId(2);
export const DEMO_PROPERTY_ID = demoId(3);

export const DEMO_WORK_JOBS = [
  {
    key: "boiler",
    ticketId: demoId(101),
    workOrderId: demoId(201),
    summary: "Annual boiler service",
    description: "Gas Safe annual service and flue check.",
    category: "heating",
    amount: 185,
    daysAgo: 28,
  },
  {
    key: "tap",
    ticketId: demoId(102),
    workOrderId: demoId(202),
    summary: "Leaking kitchen tap",
    description: "Replace leaking mixer tap and check stopcock.",
    category: "plumbing",
    amount: 96.5,
    daysAgo: 11,
  },
  {
    key: "electrical",
    ticketId: demoId(103),
    workOrderId: demoId(203),
    summary: "EICR remedial works",
    description: "Consumer unit labelling and socket repairs after EICR.",
    category: "electrical",
    amount: 240,
    daysAgo: 4,
  },
] as const;

function scheduledFor(daysAgo: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

async function ensureDemoLandlord(branchId: string) {
  const [existing] = await db
    .select()
    .from(landlords)
    .where(eq(landlords.branchId, branchId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(landlords)
    .values({
      id: DEMO_LANDLORD_ID,
      branchId,
      firstName: "Helen",
      lastName: "Whitaker",
      email: "helen.whitaker@example.com",
      notes: "Demo landlord for sample works invoices",
    })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  const [again] = await db.select().from(landlords).where(eq(landlords.id, DEMO_LANDLORD_ID)).limit(1);
  return again ?? existing;
}

async function ensureDemoContractor(branchId: string) {
  const [existing] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.branchId, branchId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(contractors)
    .values({
      id: DEMO_CONTRACTOR_ID,
      branchId,
      name: "A1 Plumbing & Heating",
      email: "jobs@a1plumbing.example.com",
      trade: "plumbing",
    })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  const [again] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.id, DEMO_CONTRACTOR_ID))
    .limit(1);
  return again ?? existing;
}

async function ensureDemoProperties(branchId: string, landlordId: string) {
  let rows = await db.select().from(properties).where(eq(properties.branchId, branchId));
  if (rows.length === 0) {
    await db
      .insert(properties)
      .values({
        id: DEMO_PROPERTY_ID,
        branchId,
        landlordId,
        agentRef: "DEMO-WORKS-001",
        slug: "demo-works-invoice-property",
        displayAddress: "14 Albert Road, Middlesbrough, TS1 1PR",
        street: "Albert Road",
        town: "Middlesbrough",
        postcode: "TS1 1PR",
        pricePcm: "750",
        deposit: "750",
        availableFrom: new Date().toISOString().slice(0, 10),
        bedrooms: 2,
        propertyType: "flat",
        status: "let_agreed",
        description: "Demo property used for sample works invoices.",
        isVacant: false,
      })
      .onConflictDoNothing();
    rows = await db.select().from(properties).where(eq(properties.branchId, branchId));
  }

  const picked = DEMO_WORK_JOBS.map((_, i) => rows[i % rows.length]);
  for (const property of picked) {
    if (property.landlordId) continue;
    await db
      .update(properties)
      .set({ landlordId })
      .where(and(eq(properties.id, property.id), isNull(properties.landlordId)));
    property.landlordId = landlordId;
  }
  return picked;
}

async function activeTenancyId(propertyId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: tenancies.id })
    .from(tenancies)
    .where(and(eq(tenancies.propertyId, propertyId), eq(tenancies.status, "active")))
    .limit(1);
  return row?.id ?? null;
}

export async function seedDemoWorkInvoices(branchId: string): Promise<{
  created: number;
  skipped: number;
}> {
  await ensureJobInvoiceSchema();

  const landlord = await ensureDemoLandlord(branchId);
  if (!landlord) return { created: 0, skipped: 0 };

  const contractor = await ensureDemoContractor(branchId);
  const propertyRows = await ensureDemoProperties(branchId, landlord.id);
  if (propertyRows.length === 0) return { created: 0, skipped: 0 };

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < DEMO_WORK_JOBS.length; i++) {
    const job = DEMO_WORK_JOBS[i];
    const property = propertyRows[i % propertyRows.length];
    const [existingInvoice] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.workOrderId, job.workOrderId))
      .limit(1);
    if (existingInvoice) {
      skipped += 1;
      continue;
    }

    const tenancyId = await activeTenancyId(property.id);
    const when = scheduledFor(job.daysAgo);

    await db
      .insert(tickets)
      .values({
        id: job.ticketId,
        branchId,
        propertyId: property.id,
        tenancyId,
        reportedByType: "staff",
        source: "staff",
        category: job.category,
        summary: job.summary,
        description: job.description,
        status: "completed",
        isEmergency: false,
      })
      .onConflictDoNothing();

    await db
      .insert(workOrders)
      .values({
        id: job.workOrderId,
        branchId,
        ticketId: job.ticketId,
        contractorId: contractor?.id ?? null,
        scheduledFor: when,
        status: "completed",
        costEstimate: String(job.amount),
        finalCost: String(job.amount),
        meta: { demo_seed: DEMO_WORK_INVOICE_SEED },
      })
      .onConflictDoNothing();

    const [wo] = await db.select().from(workOrders).where(eq(workOrders.id, job.workOrderId)).limit(1);
    if (!wo) {
      skipped += 1;
      continue;
    }

    const invoice = await postCompletedWorkOrderCost(wo);
    if (invoice) {
      const meta =
        invoice.meta && typeof invoice.meta === "object"
          ? (invoice.meta as Record<string, unknown>)
          : {};
      await db
        .update(invoices)
        .set({ meta: { ...meta, demo_seed: DEMO_WORK_INVOICE_SEED } })
        .where(eq(invoices.id, invoice.id));
      created += 1;
    } else {
      skipped += 1;
    }
  }

  return { created, skipped };
}
