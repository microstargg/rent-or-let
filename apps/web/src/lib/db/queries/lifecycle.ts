import { eq, and, desc, asc, isNull, lt } from "drizzle-orm";
import { db } from "../index";
import { tenancies, inspections, notices, properties, renters, documents } from "../schema";
import { createComplianceItem, markComplianceServed, createDocument, listDocumentsForEntity } from "./compliance";
import { createTask } from "./finance";
import {
  defaultInspectionReport,
  addMonthsIso,
  type InspectionReport,
} from "@/lib/inspections/report";

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
  const [property] = await db
    .select({ bedrooms: properties.bedrooms })
    .from(properties)
    .where(eq(properties.id, data.propertyId))
    .limit(1);
  const [row] = await db
    .insert(inspections)
    .values({
      branchId: data.branchId,
      propertyId: data.propertyId,
      tenancyId: data.tenancyId ?? null,
      type: data.type,
      scheduledAt: data.scheduledAt ?? null,
      notes: data.notes ?? null,
      meta: { report: defaultInspectionReport(property?.bedrooms ?? 2) },
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
      landlordId: properties.landlordId,
    })
    .from(inspections)
    .innerJoin(properties, eq(inspections.propertyId, properties.id))
    .where(eq(inspections.branchId, branchId))
    .orderBy(desc(inspections.createdAt));
}

export async function getInspectionById(id: string) {
  const [row] = await db
    .select({
      inspection: inspections,
      property: properties,
      tenancy: tenancies,
    })
    .from(inspections)
    .innerJoin(properties, eq(inspections.propertyId, properties.id))
    .leftJoin(tenancies, eq(inspections.tenancyId, tenancies.id))
    .where(eq(inspections.id, id))
    .limit(1);
  return row ?? null;
}

export async function saveInspectionReport(
  id: string,
  data: { report: InspectionReport; notes?: string | null; complete?: boolean; summary?: string }
) {
  const existing = await getInspectionById(id);
  if (!existing) return null;
  const meta =
    existing.inspection.meta && typeof existing.inspection.meta === "object"
      ? (existing.inspection.meta as Record<string, unknown>)
      : {};
  const [row] = await db
    .update(inspections)
    .set({
      meta: { ...meta, report: data.report },
      notes: data.notes ?? existing.inspection.notes,
      summary: data.summary ?? existing.inspection.summary,
      ...(data.complete ? { completedAt: new Date() } : {}),
    })
    .where(eq(inspections.id, id))
    .returning();
  return row ?? null;
}

export async function scheduleInterimInspections(tenancyId: string) {
  const [tenancy] = await db.select().from(tenancies).where(eq(tenancies.id, tenancyId)).limit(1);
  if (!tenancy || tenancy.status !== "active") return [];

  const existing = await db
    .select()
    .from(inspections)
    .where(and(eq(inspections.tenancyId, tenancyId), eq(inspections.type, "interim")));
  if (existing.length >= 2) return existing;

  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, tenancy.propertyId))
    .limit(1);
  const report = defaultInspectionReport(property?.bedrooms ?? 2);
  const created = [];
  for (const months of [6, 12]) {
    if (existing.some((i) => i.scheduledAt && Math.abs(new Date(i.scheduledAt).getTime() - addMonthsIso(tenancy.startDate, months).getTime()) < 86400000 * 20)) {
      continue;
    }
    created.push(
      await createInspection({
        branchId: tenancy.branchId,
        propertyId: tenancy.propertyId,
        tenancyId,
        type: "interim",
        scheduledAt: addMonthsIso(tenancy.startDate, months),
      })
    );
  }
  for (const row of created) {
    await db
      .update(inspections)
      .set({ meta: { report } })
      .where(eq(inspections.id, row.id));
  }
  return [...existing, ...created];
}

export async function listInspectionsForLandlord(landlordId: string) {
  return db
    .select({
      inspection: inspections,
      propertyAddress: properties.displayAddress,
    })
    .from(inspections)
    .innerJoin(properties, eq(inspections.propertyId, properties.id))
    .where(eq(properties.landlordId, landlordId))
    .orderBy(desc(inspections.scheduledAt), desc(inspections.createdAt));
}

export async function listOverdueInspections(branchId: string, now = new Date()) {
  return db
    .select({
      inspection: inspections,
      propertyAddress: properties.displayAddress,
    })
    .from(inspections)
    .innerJoin(properties, eq(inspections.propertyId, properties.id))
    .where(
      and(
        eq(inspections.branchId, branchId),
        isNull(inspections.completedAt),
        lt(inspections.scheduledAt, now)
      )
    )
    .orderBy(asc(inspections.scheduledAt));
}

export async function getTenancyNoticeContext(tenancyId: string) {
  const [row] = await db
    .select({
      tenancy: tenancies,
      property: properties,
      renterFirstName: renters.firstName,
      renterLastName: renters.lastName,
      renterEmail: renters.email,
    })
    .from(tenancies)
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .innerJoin(renters, eq(tenancies.primaryRenterId, renters.id))
    .where(eq(tenancies.id, tenancyId))
    .limit(1);
  if (!row) return null;
  const previous = await db
    .select()
    .from(notices)
    .where(and(eq(notices.tenancyId, tenancyId), eq(notices.type, "section_13")))
    .orderBy(desc(notices.servedAt), desc(notices.createdAt))
    .limit(1);
  return { ...row, lastSection13: previous[0] ?? null };
}

export async function listTenancyEvidence(tenancyId: string) {
  const noticeRows = await db.select().from(notices).where(eq(notices.tenancyId, tenancyId));
  const docs = await listDocumentsForEntity("tenancy", tenancyId);
  return { notices: noticeRows, documents: docs };
}

export async function createNotice(data: {
  branchId: string;
  tenancyId: string;
  type: string;
  effectiveAt?: string | null;
  grounds?: string | null;
  serve?: boolean;
  servedTo?: string | null;
  meta?: Record<string, unknown>;
}) {
  const [row] = await db
    .insert(notices)
    .values({
      branchId: data.branchId,
      tenancyId: data.tenancyId,
      type: data.type,
      effectiveAt: data.effectiveAt ?? null,
      grounds: data.grounds ?? null,
      servedAt: data.serve ? new Date() : null,
      meta: data.meta ?? {},
    })
    .returning();

  if (data.serve) {
    const doc = await createDocument({
      branchId: data.branchId,
      entityType: "tenancy",
      entityId: data.tenancyId,
      kind: data.type,
      url: `/api/admin/notices/${row.id}/pdf`,
      filename: `${data.type}.pdf`,
    });
    await db
      .update(documents)
      .set({
        servedAt: new Date(),
        servedChannel: "portal",
        servedTo: data.servedTo ?? null,
      })
      .where(eq(documents.id, doc.id));
    const [updated] = await db
      .update(notices)
      .set({ documentId: doc.id })
      .where(eq(notices.id, row.id))
      .returning();
    return updated;
  }
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
