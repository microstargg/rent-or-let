import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db } from "../index";
import { agencyEq, currentAgencyId, ensureAgency } from "../agency-scope";
import {
  complianceItems,
  documents,
  landlords,
  properties,
  tasks,
  tenancies,
  tenancyAgreements,
} from "../schema";
import { createTask } from "./finance";
import {
  computeStatus,
  hasEvidence,
  propertyRequirements,
  scoreRequirements,
  isActiveTenancy,
  type Requirement,
} from "@/lib/compliance/requirements";
import {
  REGISTER_TRACKED_TYPES,
  registerInfo,
  registerStatus,
  type RegisterInfo,
  type RegisterStatus,
} from "@/lib/compliance/register";

export const TENANCY_COMPLIANCE_TYPES = [
  "gas_safety",
  "epc",
  "smoke_co",
  "deposit_pi",
  "rra_info_sheet",
  "right_to_rent",
] as const;

/**
 * Status for a record. `hasEvidence` should come from `hasEvidence()` in
 * lib/compliance/requirements: a file, reference, issue date or "seen" tick.
 * An expiry date with no evidence counts as missing.
 */
export function computeComplianceStatus(
  expiresAt: string | null | undefined,
  evidence: boolean,
  type?: string
): "missing" | "valid" | "expiring" | "expired" {
  return computeStatus(expiresAt, evidence, type);
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
  await ensureAgency();
  const [row] = await db
    .insert(documents)
    .values({
      agencyId: currentAgencyId(),
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
  await ensureAgency();
  const [row] = await db
    .update(documents)
    .set({
      servedAt: new Date(),
      servedTo: data.servedTo ?? null,
      servedChannel: data.servedChannel,
    })
    .where(and(eq(documents.id, documentId), agencyEq(documents.agencyId)))
    .returning();
  return row ?? null;
}

export async function getDocumentById(id: string) {
  await ensureAgency();
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), agencyEq(documents.agencyId)))
    .limit(1);
  return row ?? null;
}

export async function listDocumentsForEntity(entityType: string, entityId: string) {
  await ensureAgency();
  return db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.entityType, entityType),
        eq(documents.entityId, entityId),
        agencyEq(documents.agencyId)
      )
    )
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
  await ensureAgency();
  const status =
    data.status ??
    computeComplianceStatus(
      data.expiresAt,
      hasEvidence({
        documentId: data.documentId ?? null,
        reference: data.reference ?? null,
        issuedAt: data.issuedAt ?? null,
      }),
      data.type
    );
  const [row] = await db
    .insert(complianceItems)
    .values({
      agencyId: currentAgencyId(),
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
  if (row && REGISTER_TRACKED_TYPES.has(data.type) && data.expiresAt) {
    await createRegisterUpdateTask(data.branchId, data.propertyId, `new ${data.type.replaceAll("_", " ")} record`);
  }
  return row;
}

/**
 * The landlord register must be updated within 28 days of a certificate,
 * licence or tenancy change. Creates a task when the property is registered.
 */
export async function createRegisterUpdateTask(branchId: string, propertyId: string, what: string) {
  await ensureAgency();
  const [p] = await db
    .select({ number: properties.prsPropertyNumber, address: properties.displayAddress })
    .from(properties)
    .where(and(eq(properties.id, propertyId), agencyEq(properties.agencyId)))
    .limit(1);
  if (!p?.number) return null;
  const due = new Date();
  due.setDate(due.getDate() + 28);
  return createTask({
    branchId,
    title: `Update the landlord register for ${p.address} (${what}) within 28 days`,
    relatedType: "property",
    relatedId: propertyId,
    dueAt: due,
  });
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
  await ensureAgency();
  const existing = await getComplianceItemById(id);
  if (!existing) return null;

  const expiresAt = data.expiresAt !== undefined ? data.expiresAt : existing.expiresAt;
  const documentId = data.documentId !== undefined ? data.documentId : existing.documentId;
  const reference = data.reference !== undefined ? data.reference : existing.reference;
  const issuedAt = data.issuedAt !== undefined ? data.issuedAt : existing.issuedAt;
  const status =
    data.status ??
    computeComplianceStatus(
      expiresAt,
      hasEvidence({ documentId, reference, issuedAt, meta: existing.meta }),
      existing.type
    );

  if (
    REGISTER_TRACKED_TYPES.has(existing.type) &&
    data.expiresAt !== undefined &&
    data.expiresAt !== existing.expiresAt
  ) {
    await createRegisterUpdateTask(existing.branchId, existing.propertyId, `${existing.type.replaceAll("_", " ")} renewed`);
  }
  // A new expiry date starts the landlord reminder cycle again.
  const meta =
    data.expiresAt !== undefined && data.expiresAt !== existing.expiresAt
      ? { ...((existing.meta ?? {}) as Record<string, unknown>), landlordReminders: [] }
      : undefined;
  const [row] = await db
    .update(complianceItems)
    .set({
      ...data,
      ...(meta && { meta }),
      status,
      updatedAt: new Date(),
    })
    .where(and(eq(complianceItems.id, id), agencyEq(complianceItems.agencyId)))
    .returning();
  return row ?? null;
}

export async function getComplianceItemById(id: string) {
  await ensureAgency();
  const [row] = await db
    .select()
    .from(complianceItems)
    .where(and(eq(complianceItems.id, id), agencyEq(complianceItems.agencyId)))
    .limit(1);
  return row ?? null;
}

export async function listComplianceItems(branchId: string, propertyId?: string) {
  await ensureAgency();
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
      .where(
        and(
          eq(complianceItems.branchId, branchId),
          eq(complianceItems.propertyId, propertyId),
          agencyEq(complianceItems.agencyId)
        )
      )
      .orderBy(desc(complianceItems.updatedAt));
  }
  return base
    .where(and(eq(complianceItems.branchId, branchId), agencyEq(complianceItems.agencyId)))
    .orderBy(desc(complianceItems.updatedAt));
}

export async function seedTenancyComplianceChecklist(data: {
  branchId: string;
  propertyId: string;
  tenancyId: string;
}) {
  await ensureAgency();
  const existing = await db
    .select()
    .from(complianceItems)
    .where(
      and(
        eq(complianceItems.tenancyId, data.tenancyId),
        inArray(complianceItems.type, [...TENANCY_COMPLIANCE_TYPES]),
        agencyEq(complianceItems.agencyId)
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

/**
 * Every requirement for the branch's properties (or one property), matched
 * against recorded items. Missing requirements are included.
 */
export async function listBranchRequirements(
  branchId: string,
  opts: { propertyIds?: string[] } = {}
): Promise<
  {
    property: { id: string; displayAddress: string; landlordId: string | null; metadata: unknown };
    requirements: Requirement[];
    register: RegisterInfo & { isLet: boolean; landlordRenewalDate: string | null } & RegisterStatus;
  }[]
> {
  await ensureAgency();
  const propFilter = opts.propertyIds
    ? opts.propertyIds.length
      ? inArray(properties.id, opts.propertyIds)
      : sql`false`
    : undefined;
  const props = await db
    .select({
      id: properties.id,
      displayAddress: properties.displayAddress,
      landlordId: properties.landlordId,
      metadata: properties.metadata,
      postcode: properties.postcode,
      prsPropertyNumber: properties.prsPropertyNumber,
      prsRegisteredAt: properties.prsRegisteredAt,
      prsRegion: properties.prsRegion,
      landlordRenewalDate: landlords.prsRenewalDate,
    })
    .from(properties)
    .leftJoin(landlords, eq(properties.landlordId, landlords.id))
    .where(and(eq(properties.branchId, branchId), agencyEq(properties.agencyId), propFilter));
  if (!props.length) return [];
  const ids = props.map((p) => p.id);
  const [tenancyRows, itemRows, signed] = await Promise.all([
    db
      .select({
        id: tenancies.id,
        propertyId: tenancies.propertyId,
        startDate: tenancies.startDate,
        status: tenancies.status,
        depositAmount: tenancies.depositAmount,
      })
      .from(tenancies)
      .where(and(inArray(tenancies.propertyId, ids), agencyEq(tenancies.agencyId))),
    db
      .select()
      .from(complianceItems)
      .where(and(inArray(complianceItems.propertyId, ids), agencyEq(complianceItems.agencyId))),
    db
      .select({ tenancyId: tenancyAgreements.tenancyId })
      .from(tenancyAgreements)
      .where(and(eq(tenancyAgreements.status, "signed"), agencyEq(tenancyAgreements.agencyId)))
      .catch(() => [] as { tenancyId: string }[]),
  ]);
  const signedIds = new Set(signed.map((s) => s.tenancyId));
  return props.map((p) => {
    const requirements = propertyRequirements({
      property: p,
      tenancies: tenancyRows,
      items: itemRows,
      signedAgreementTenancyIds: signedIds,
    });
    const isLet = tenancyRows.some((t) => t.propertyId === p.id && isActiveTenancy(t));
    const info = registerInfo(p);
    const reg = registerStatus(info, p.landlordRenewalDate);
    // Only let properties must be registered during the rollout.
    if (isLet && reg.status !== "not_due") {
      requirements.push({
        key: "prs_register",
        type: "prs_register",
        propertyId: p.id,
        tenancyId: null,
        reason: info.propertyNumber
          ? "Registered on the government's landlord register. The fee renews every year and changes must be updated within 28 days."
          : `Every let property must be on the government's landlord register${info.deadline ? " by its region's deadline" : ""}. The landlord starts the registration and pays the fee.`,
        responsible: "landlord",
        status: reg.status,
        item: null,
        required: true,
        dueDate: reg.dueDate,
      });
    }
    return {
      property: { id: p.id, displayAddress: p.displayAddress, landlordId: p.landlordId, metadata: p.metadata },
      requirements,
      register: { ...info, ...reg, isLet, landlordRenewalDate: p.landlordRenewalDate },
    };
  });
}

export async function getPropertyComplianceScore(propertyId: string) {
  await ensureAgency();
  const [p] = await db
    .select({ branchId: properties.branchId })
    .from(properties)
    .where(and(eq(properties.id, propertyId), agencyEq(properties.agencyId)))
    .limit(1);
  if (!p) return scoreRequirements([]);
  const [row] = await listBranchRequirements(p.branchId, { propertyIds: [propertyId] });
  return scoreRequirements(row?.requirements ?? []);
}

export async function listPropertyComplianceScores(branchId: string) {
  const rows = await listBranchRequirements(branchId);
  return rows
    .map(({ property, requirements }) => ({
      propertyId: property.id,
      propertyAddress: property.displayAddress,
      ...scoreRequirements(requirements),
    }))
    .sort((a, b) => a.score - b.score);
}

export async function refreshComplianceStatuses(branchId: string) {
  await ensureAgency();
  const items = await db
    .select()
    .from(complianceItems)
    .where(and(eq(complianceItems.branchId, branchId), agencyEq(complianceItems.agencyId)));

  let updated = 0;
  let tasksCreated = 0;
  /** Items that just became expiring or expired, for notifications. */
  const changed: {
    id: string;
    propertyId: string;
    type: string;
    status: "expiring" | "expired";
    expiresAt: string | null;
  }[] = [];
  for (const item of items) {
    const next = computeComplianceStatus(item.expiresAt, hasEvidence(item), item.type);
    if (next !== item.status && (next === "expiring" || next === "expired")) {
      changed.push({
        id: item.id,
        propertyId: item.propertyId,
        type: item.type,
        status: next,
        expiresAt: item.expiresAt,
      });
    }
    if (next !== item.status) {
      await db
        .update(complianceItems)
        .set({ status: next, updatedAt: new Date() })
        .where(and(eq(complianceItems.id, item.id), agencyEq(complianceItems.agencyId)));
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
            eq(tasks.relatedId, item.id),
            agencyEq(tasks.agencyId)
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
  return { updated, tasksCreated, changed };
}

export async function markComplianceServed(
  itemId: string,
  data: { servedTo?: string; servedChannel: string }
) {
  await ensureAgency();
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

export async function upsertEpcForProperty(data: {
  branchId: string;
  propertyId: string;
  rating: string;
  issuedAt?: string | null;
  expiresAt?: string | null;
  certificateUrl?: string | null;
  reference?: string | null;
}) {
  await ensureAgency();
  const existing = await db
    .select()
    .from(complianceItems)
    .where(
      and(
        eq(complianceItems.propertyId, data.propertyId),
        eq(complianceItems.type, "epc"),
        agencyEq(complianceItems.agencyId)
      )
    )
    .limit(1);

  if (existing[0]) {
    return updateComplianceItem(existing[0].id, {
      issuedAt: data.issuedAt ?? existing[0].issuedAt,
      expiresAt: data.expiresAt ?? existing[0].expiresAt,
      reference: data.reference ?? existing[0].reference,
    });
  }

  return createComplianceItem({
    branchId: data.branchId,
    propertyId: data.propertyId,
    type: "epc",
    issuedAt: data.issuedAt,
    expiresAt: data.expiresAt,
    reference: data.reference ?? data.rating,
  });
}

export async function countComplianceIssues(branchId: string) {
  await ensureAgency();
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(complianceItems)
    .where(
      and(
        eq(complianceItems.branchId, branchId),
        agencyEq(complianceItems.agencyId),
        inArray(complianceItems.status, ["missing", "expiring", "expired"])
      )
    );
  return row?.value ?? 0;
}

/** Save gas supply and licensing settings into properties.metadata.compliance. */
export async function updatePropertyComplianceSettings(
  propertyId: string,
  settings: { gasSupply?: boolean; licensing?: "hmo" | "selective" | "additional" | null }
) {
  await ensureAgency();
  const [p] = await db
    .select({ metadata: properties.metadata })
    .from(properties)
    .where(and(eq(properties.id, propertyId), agencyEq(properties.agencyId)))
    .limit(1);
  if (!p) return null;
  const metadata = (p.metadata ?? {}) as Record<string, unknown>;
  const current = (metadata.compliance ?? {}) as Record<string, unknown>;
  const next = { ...current };
  if (settings.gasSupply !== undefined) next.gasSupply = settings.gasSupply;
  if (settings.licensing !== undefined) next.licensing = settings.licensing;
  const [row] = await db
    .update(properties)
    .set({ metadata: { ...metadata, compliance: next }, updatedAt: new Date() })
    .where(and(eq(properties.id, propertyId), agencyEq(properties.agencyId)))
    .returning({ id: properties.id });
  return row ?? null;
}

/** Merge keys into a compliance item's meta (used to record reminder sends). */
export async function mergeComplianceItemMeta(id: string, patch: Record<string, unknown>) {
  await ensureAgency();
  const existing = await getComplianceItemById(id);
  if (!existing) return null;
  const meta = { ...((existing.meta ?? {}) as Record<string, unknown>), ...patch };
  await db
    .update(complianceItems)
    .set({ meta })
    .where(and(eq(complianceItems.id, id), agencyEq(complianceItems.agencyId)));
  return meta;
}

/** Register details for a property: number, date registered, region override. */
export async function updatePropertyRegister(
  propertyId: string,
  data: { prsPropertyNumber?: string | null; prsRegisteredAt?: string | null; prsRegion?: string | null }
) {
  await ensureAgency();
  const [row] = await db
    .update(properties)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(properties.id, propertyId), agencyEq(properties.agencyId)))
    .returning({ id: properties.id, landlordId: properties.landlordId, registeredAt: properties.prsRegisteredAt });
  // The landlord's fees all renew a year after their first property was registered.
  if (row?.landlordId && row.registeredAt) {
    const [l] = await db
      .select({ renewal: landlords.prsRenewalDate })
      .from(landlords)
      .where(and(eq(landlords.id, row.landlordId), agencyEq(landlords.agencyId)))
      .limit(1);
    if (l && !l.renewal) {
      const d = new Date(`${row.registeredAt}T00:00:00Z`);
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      await db
        .update(landlords)
        .set({ prsRenewalDate: d.toISOString().slice(0, 10) })
        .where(and(eq(landlords.id, row.landlordId), agencyEq(landlords.agencyId)));
    }
  }
  return row ?? null;
}
