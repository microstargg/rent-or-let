import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db } from "../index";
import { complianceItems, documents, properties, tasks } from "../schema";
import { createTask } from "./finance";

export const TENANCY_COMPLIANCE_TYPES = [
  "gas_safety",
  "epc",
  "deposit_pi",
  "rra_info_sheet",
  "right_to_rent",
] as const;

export function computeComplianceStatus(
  expiresAt: string | null | undefined,
  hasDocument: boolean
): "missing" | "valid" | "expiring" | "expired" {
  if (!expiresAt && !hasDocument) return "missing";
  if (!expiresAt) return hasDocument ? "valid" : "missing";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiresAt);
  const days = Math.floor((exp.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "valid";
}

export async function createDocument(data: {
  branchId: string;
  entityType: string;
  entityId: string;
  kind: string;
  url: string;
  filename?: string | null;
  meta?: Record<string, unknown>;
}) {
  const [row] = await db
    .insert(documents)
    .values({
      branchId: data.branchId,
      entityType: data.entityType,
      entityId: data.entityId,
      kind: data.kind,
      url: data.url,
      filename: data.filename ?? null,
      meta: data.meta ?? {},
    })
    .returning();
  return row;
}

export async function markDocumentServed(
  documentId: string,
  data: { servedTo?: string; servedChannel: string }
) {
  const [row] = await db
    .update(documents)
    .set({
      servedAt: new Date(),
      servedTo: data.servedTo ?? null,
      servedChannel: data.servedChannel,
    })
    .where(eq(documents.id, documentId))
    .returning();
  return row ?? null;
}

export async function getDocumentById(id: string) {
  const [row] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return row ?? null;
}

export async function listDocumentsForEntity(entityType: string, entityId: string) {
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.entityType, entityType), eq(documents.entityId, entityId)))
    .orderBy(desc(documents.createdAt));
}

export async function createComplianceItem(data: {
  branchId: string;
  propertyId: string;
  tenancyId?: string | null;
  type: string;
  status?: string;
  issuedAt?: string | null;
  expiresAt?: string | null;
  reference?: string | null;
  documentId?: string | null;
}) {
  const status =
    data.status ??
    computeComplianceStatus(data.expiresAt, Boolean(data.documentId));
  const [row] = await db
    .insert(complianceItems)
    .values({
      branchId: data.branchId,
      propertyId: data.propertyId,
      tenancyId: data.tenancyId ?? null,
      type: data.type,
      status,
      issuedAt: data.issuedAt ?? null,
      expiresAt: data.expiresAt ?? null,
      reference: data.reference ?? null,
      documentId: data.documentId ?? null,
    })
    .returning();
  return row;
}

export async function updateComplianceItem(
  id: string,
  data: Partial<{
    status: string;
    issuedAt: string | null;
    expiresAt: string | null;
    reference: string | null;
    documentId: string | null;
    tenancyId: string | null;
  }>
) {
  const existing = await getComplianceItemById(id);
  if (!existing) return null;

  const expiresAt = data.expiresAt !== undefined ? data.expiresAt : existing.expiresAt;
  const documentId = data.documentId !== undefined ? data.documentId : existing.documentId;
  const status =
    data.status ??
    computeComplianceStatus(expiresAt, Boolean(documentId));

  const [row] = await db
    .update(complianceItems)
    .set({
      ...data,
      status,
      updatedAt: new Date(),
    })
    .where(eq(complianceItems.id, id))
    .returning();
  return row ?? null;
}

export async function getComplianceItemById(id: string) {
  const [row] = await db.select().from(complianceItems).where(eq(complianceItems.id, id)).limit(1);
  return row ?? null;
}

export async function listComplianceItems(branchId: string, propertyId?: string) {
  const base = db
    .select({
      item: complianceItems,
      propertyAddress: properties.displayAddress,
      document: documents,
    })
    .from(complianceItems)
    .innerJoin(properties, eq(complianceItems.propertyId, properties.id))
    .leftJoin(documents, eq(complianceItems.documentId, documents.id));

  if (propertyId) {
    return base
      .where(and(eq(complianceItems.branchId, branchId), eq(complianceItems.propertyId, propertyId)))
      .orderBy(desc(complianceItems.updatedAt));
  }
  return base
    .where(eq(complianceItems.branchId, branchId))
    .orderBy(desc(complianceItems.updatedAt));
}

export async function seedTenancyComplianceChecklist(data: {
  branchId: string;
  propertyId: string;
  tenancyId: string;
}) {
  const existing = await db
    .select()
    .from(complianceItems)
    .where(
      and(
        eq(complianceItems.tenancyId, data.tenancyId),
        inArray(complianceItems.type, [...TENANCY_COMPLIANCE_TYPES])
      )
    );
  const have = new Set(existing.map((e) => e.type));
  const created = [];
  for (const type of TENANCY_COMPLIANCE_TYPES) {
    if (have.has(type)) continue;
    created.push(
      await createComplianceItem({
        branchId: data.branchId,
        propertyId: data.propertyId,
        tenancyId: data.tenancyId,
        type,
        status: "missing",
      })
    );
  }
  return created;
}

export async function getPropertyComplianceScore(propertyId: string) {
  const items = await db
    .select()
    .from(complianceItems)
    .where(eq(complianceItems.propertyId, propertyId));
  if (items.length === 0) return { score: 100, total: 0, valid: 0, missing: 0, expiring: 0, expired: 0 };
  const counts = { valid: 0, missing: 0, expiring: 0, expired: 0 };
  for (const i of items) {
    if (i.status === "valid") counts.valid += 1;
    else if (i.status === "expiring") counts.expiring += 1;
    else if (i.status === "expired") counts.expired += 1;
    else counts.missing += 1;
  }
  const score = Math.round((counts.valid / items.length) * 100);
  return { score, total: items.length, ...counts };
}

export async function listPropertyComplianceScores(branchId: string) {
  const props = await db
    .select({ id: properties.id, displayAddress: properties.displayAddress })
    .from(properties)
    .where(eq(properties.branchId, branchId));

  const results = [];
  for (const p of props) {
    const score = await getPropertyComplianceScore(p.id);
    results.push({ propertyId: p.id, propertyAddress: p.displayAddress, ...score });
  }
  return results.sort((a, b) => a.score - b.score);
}

export async function refreshComplianceStatuses(branchId: string) {
  const items = await db
    .select()
    .from(complianceItems)
    .where(eq(complianceItems.branchId, branchId));

  let updated = 0;
  let tasksCreated = 0;
  for (const item of items) {
    const next = computeComplianceStatus(item.expiresAt, Boolean(item.documentId));
    if (next !== item.status) {
      await db
        .update(complianceItems)
        .set({ status: next, updatedAt: new Date() })
        .where(eq(complianceItems.id, item.id));
      updated += 1;
    }

    const effectiveStatus = next;
    if (effectiveStatus === "expiring" || effectiveStatus === "expired") {
      const existingTask = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(
            eq(tasks.branchId, branchId),
            eq(tasks.status, "open"),
            eq(tasks.relatedType, "compliance_item"),
            eq(tasks.relatedId, item.id)
          )
        )
        .limit(1);
      if (!existingTask.length) {
        await createTask({
          branchId,
          title: `Compliance ${effectiveStatus}: ${item.type}`,
          relatedType: "compliance_item",
          relatedId: item.id,
          dueAt: item.expiresAt ? new Date(item.expiresAt) : new Date(),
        });
        tasksCreated += 1;
      }
    }
  }
  return { updated, tasksCreated };
}

export async function markComplianceServed(
  itemId: string,
  data: { servedTo?: string; servedChannel: string }
) {
  const item = await getComplianceItemById(itemId);
  if (!item) return null;

  let documentId = item.documentId;
  if (!documentId) {
    const doc = await createDocument({
      branchId: item.branchId,
      entityType: "compliance_item",
      entityId: item.id,
      kind: item.type,
      url: "#served-without-file",
      filename: `${item.type}-served`,
    });
    documentId = doc.id;
    await updateComplianceItem(item.id, { documentId });
  }

  const served = await markDocumentServed(documentId, data);
  return { item: await getComplianceItemById(itemId), document: served };
}

export async function countComplianceIssues(branchId: string) {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(complianceItems)
    .where(
      and(
        eq(complianceItems.branchId, branchId),
        inArray(complianceItems.status, ["missing", "expiring", "expired"])
      )
    );
  return row?.value ?? 0;
}
