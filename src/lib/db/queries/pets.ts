import { eq, and, desc, asc, inArray, lt } from "drizzle-orm";
import { db } from "../index";
import { petRequests, tenancies, properties, renters, documents } from "../schema";
import { ensurePetRequestsSchema } from "../ensure-schema";
import {
  initialPetDueAt,
  dueAfterFurtherInfo,
  dueAfterSuperiorResponse,
  isPetRequestOverdue,
} from "@/lib/rra/pet-request";
import { createDocument, markDocumentServed } from "./compliance";

async function ready() {
  await ensurePetRequestsSchema();
}

export async function listPetRequests(branchId: string) {
  await ready();
  return db
    .select({
      request: petRequests,
      propertyAddress: properties.displayAddress,
      renterFirstName: renters.firstName,
      renterLastName: renters.lastName,
    })
    .from(petRequests)
    .innerJoin(tenancies, eq(petRequests.tenancyId, tenancies.id))
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .leftJoin(renters, eq(petRequests.renterId, renters.id))
    .where(eq(petRequests.branchId, branchId))
    .orderBy(asc(petRequests.dueAt));
}

export async function listPetRequestsForRenter(renterId: string) {
  await ready();
  return db
    .select({
      request: petRequests,
      propertyAddress: properties.displayAddress,
    })
    .from(petRequests)
    .innerJoin(tenancies, eq(petRequests.tenancyId, tenancies.id))
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .where(eq(petRequests.renterId, renterId))
    .orderBy(desc(petRequests.requestedAt));
}

export async function getPetRequestById(id: string) {
  await ready();
  const [row] = await db
    .select({
      request: petRequests,
      tenancy: tenancies,
      property: properties,
      renterFirstName: renters.firstName,
      renterLastName: renters.lastName,
    })
    .from(petRequests)
    .innerJoin(tenancies, eq(petRequests.tenancyId, tenancies.id))
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .leftJoin(renters, eq(petRequests.renterId, renters.id))
    .where(eq(petRequests.id, id))
    .limit(1);
  return row ?? null;
}

export async function createPetRequest(data: {
  branchId: string;
  tenancyId: string;
  renterId: string;
  petDescription: string;
}) {
  await ready();
  const requestedAt = new Date();
  const [row] = await db
    .insert(petRequests)
    .values({
      branchId: data.branchId,
      tenancyId: data.tenancyId,
      renterId: data.renterId,
      petDescription: data.petDescription.trim(),
      requestedAt,
      dueAt: initialPetDueAt(requestedAt),
      status: "open",
    })
    .returning();
  return row;
}

export async function decidePetRequest(
  id: string,
  data: {
    status: "approved" | "refused" | "info_requested" | "awaiting_superior";
    notes?: string;
    servedTo?: string;
  }
) {
  await ready();
  const existing = await getPetRequestById(id);
  if (!existing) return null;

  const now = new Date();
  let dueAt = existing.request.dueAt;
  let infoRequestedAt = existing.request.infoRequestedAt;
  let superiorRequestedAt = existing.request.superiorRequestedAt;
  let decisionAt = existing.request.decisionAt;
  let documentId = existing.request.documentId;

  if (data.status === "info_requested") {
    infoRequestedAt = now;
    dueAt = dueAfterFurtherInfo(now);
  } else if (data.status === "awaiting_superior") {
    superiorRequestedAt = now;
    dueAt = dueAfterSuperiorResponse(now);
  } else {
    decisionAt = now;
    const doc = await createDocument({
      branchId: existing.request.branchId,
      entityType: "pet_request",
      entityId: id,
      kind: `pet_${data.status}`,
      url: `/api/admin/pets/${id}/pdf`,
      filename: `pet-request-${data.status}.pdf`,
    });
    documentId = doc.id;
    await markDocumentServed(doc.id, {
      servedChannel: "portal",
      servedTo: data.servedTo,
    });
  }

  const [row] = await db
    .update(petRequests)
    .set({
      status: data.status,
      decisionNotes: data.notes ?? existing.request.decisionNotes,
      dueAt,
      infoRequestedAt,
      superiorRequestedAt,
      decisionAt,
      documentId,
      updatedAt: now,
    })
    .where(eq(petRequests.id, id))
    .returning();
  return row ?? null;
}

export async function listOverduePetRequests(branchId: string, now = new Date()) {
  await ready();
  const rows = await db
    .select({
      request: petRequests,
      propertyAddress: properties.displayAddress,
    })
    .from(petRequests)
    .innerJoin(tenancies, eq(petRequests.tenancyId, tenancies.id))
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .where(
      and(
        eq(petRequests.branchId, branchId),
        inArray(petRequests.status, ["open", "info_requested", "awaiting_superior", "deemed_open"]),
        lt(petRequests.dueAt, now)
      )
    )
    .orderBy(asc(petRequests.dueAt));
  return rows.filter((r) =>
    isPetRequestOverdue({ status: r.request.status, dueAt: r.request.dueAt, now })
  );
}
