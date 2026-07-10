import { eq, and, desc } from "drizzle-orm";
import { db } from "../index";
import { tenancies, inspections, notices, properties, renters, documents } from "../schema";
import { createComplianceItem, markComplianceServed, createDocument } from "./compliance";
import { createTask } from "./finance";

export async function protectDeposit(data: {
  tenancyId: string;
  scheme: string;
  reference: string;
  protectedAt?: string;
}) {
  const [tenancy] = await db.select().from(tenancies).where(eq(tenancies.id, data.tenancyId)).limit(1);
  if (!tenancy) return null;

  const [updated] = await db
    .update(tenancies)
    .set({
      depositScheme: data.scheme,
      depositProtectionRef: data.reference,
      depositProtectedAt: data.protectedAt ?? new Date().toISOString().slice(0, 10),
    })
    .where(eq(tenancies.id, data.tenancyId))
    .returning();

  // Ensure deposit_pi compliance item and mark served
  const item = await createComplianceItem({
    branchId: tenancy.branchId,
    propertyId: tenancy.propertyId,
    tenancyId: tenancy.id,
    type: "deposit_pi",
    status: "valid",
    issuedAt: data.protectedAt ?? new Date().toISOString().slice(0, 10),
    reference: data.reference,
  });
  await markComplianceServed(item.id, { servedChannel: "portal" });

  return updated;
}

export async function listDepositRegister(branchId: string) {
  return db
    .select({
      tenancy: tenancies,
      propertyAddress: properties.displayAddress,
      renterFirstName: renters.firstName,
      renterLastName: renters.lastName,
    })
    .from(tenancies)
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .innerJoin(renters, eq(tenancies.primaryRenterId, renters.id))
    .where(and(eq(tenancies.branchId, branchId), eq(tenancies.status, "active")))
    .orderBy(desc(tenancies.startDate));
}

export async function createInspection(data: {
  branchId: string;
  propertyId: string;
  tenancyId?: string | null;
  type: string;
  scheduledAt?: Date | null;
  notes?: string | null;
}) {
  const [row] = await db
    .insert(inspections)
    .values({
      branchId: data.branchId,
      propertyId: data.propertyId,
      tenancyId: data.tenancyId ?? null,
      type: data.type,
      scheduledAt: data.scheduledAt ?? null,
      notes: data.notes ?? null,
    })
    .returning();
  return row;
}

export async function completeInspection(
  id: string,
  data: { summary?: string; photoUrls?: string[] }
) {
  const [existing] = await db.select().from(inspections).where(eq(inspections.id, id)).limit(1);
  if (!existing) return null;

  for (const url of data.photoUrls ?? []) {
    await createDocument({
      branchId: existing.branchId,
      entityType: "inspection",
      entityId: id,
      kind: "photo",
      url,
    });
  }

  const [row] = await db
    .update(inspections)
    .set({
      completedAt: new Date(),
      summary: data.summary ?? existing.summary,
    })
    .where(eq(inspections.id, id))
    .returning();
  return row;
}

export async function listInspections(branchId: string) {
  return db
    .select({
      inspection: inspections,
      propertyAddress: properties.displayAddress,
    })
    .from(inspections)
    .innerJoin(properties, eq(inspections.propertyId, properties.id))
    .where(eq(inspections.branchId, branchId))
    .orderBy(desc(inspections.createdAt));
}

export async function createNotice(data: {
  branchId: string;
  tenancyId: string;
  type: string;
  effectiveAt?: string | null;
  grounds?: string | null;
  serve?: boolean;
}) {
  let documentId: string | null = null;
  if (data.serve) {
    const doc = await createDocument({
      branchId: data.branchId,
      entityType: "tenancy",
      entityId: data.tenancyId,
      kind: data.type,
      url: `#notice-${data.type}`,
      filename: `${data.type}.txt`,
    });
    documentId = doc.id;
    await db
      .update(documents)
      .set({
        servedAt: new Date(),
        servedChannel: "portal",
      })
      .where(eq(documents.id, doc.id));
  }

  const [row] = await db
    .insert(notices)
    .values({
      branchId: data.branchId,
      tenancyId: data.tenancyId,
      type: data.type,
      effectiveAt: data.effectiveAt ?? null,
      grounds: data.grounds ?? null,
      documentId,
      servedAt: data.serve ? new Date() : null,
    })
    .returning();
  return row;
}

export async function listNotices(branchId: string) {
  return db
    .select({
      notice: notices,
      propertyAddress: properties.displayAddress,
    })
    .from(notices)
    .innerJoin(tenancies, eq(notices.tenancyId, tenancies.id))
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .where(eq(notices.branchId, branchId))
    .orderBy(desc(notices.createdAt));
}

export async function bulkServeRraInfoSheet(branchId: string) {
  const active = await db
    .select()
    .from(tenancies)
    .where(and(eq(tenancies.branchId, branchId), eq(tenancies.status, "active")));

  let served = 0;
  for (const t of active) {
    const item = await createComplianceItem({
      branchId,
      propertyId: t.propertyId,
      tenancyId: t.id,
      type: "rra_info_sheet",
      status: "valid",
      issuedAt: new Date().toISOString().slice(0, 10),
    });
    await markComplianceServed(item.id, { servedChannel: "portal" });
    await createTask({
      branchId,
      title: `RRA info sheet served — tenancy ${t.id.slice(0, 8)}`,
      relatedType: "tenancy",
      relatedId: t.id,
    });
    served += 1;
  }
  return { served };
}

export async function setRentReviewDate(tenancyId: string, rentReviewDate: string) {
  const [row] = await db
    .update(tenancies)
    .set({ rentReviewDate })
    .where(eq(tenancies.id, tenancyId))
    .returning();
  return row ?? null;
}
