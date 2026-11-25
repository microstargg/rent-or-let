import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "../index";
import { agencyEq, currentAgencyId, ensureAgency } from "../agency-scope";
import { properties, renterDocuments, renters, tenancies, tenantApplications } from "../schema";
import { renterOnTenancy } from "../renter-tenancy";
import { createComplianceItem } from "./compliance";
import { displayPersonName } from "@/lib/person-name";
import { deletePrivateFile } from "@/lib/storage/private-files";

export const RENTER_DOCUMENT_KINDS: Record<string, string> = {
  right_to_rent: "Right to Rent evidence",
  id: "Photo ID",
  reference: "Reference",
  guarantor: "Guarantor document",
  proof_of_address: "Proof of address",
  income: "Proof of income",
  other: "Other",
};

export const RTR_METHODS: Record<string, string> = {
  manual: "Original documents",
  share_code: "Home Office share code",
  idsp: "Digital ID check (IDSP)",
};

/** Everything the renter profile page shows. */
export async function getRenterProfile(renterId: string) {
  await ensureAgency();
  const [renter] = await db
    .select()
    .from(renters)
    .where(and(eq(renters.id, renterId), agencyEq(renters.agencyId)))
    .limit(1);
  if (!renter) return null;

  const [tenancyRows, documents, applications] = await Promise.all([
    db
      .select({
        id: tenancies.id,
        status: tenancies.status,
        startDate: tenancies.startDate,
        endDate: tenancies.endDate,
        primaryRenterId: tenancies.primaryRenterId,
        propertyId: tenancies.propertyId,
        address: properties.displayAddress,
      })
      .from(tenancies)
      .innerJoin(properties, eq(tenancies.propertyId, properties.id))
      .where(and(agencyEq(tenancies.agencyId), renterOnTenancy(renterId)))
      .orderBy(desc(tenancies.startDate)),
    listRenterDocuments(renterId),
    renter.email
      ? db
          .select({
            id: tenantApplications.id,
            status: tenantApplications.status,
            referencingStatus: tenantApplications.referencingStatus,
            createdAt: tenantApplications.createdAt,
          })
          .from(tenantApplications)
          .where(
            and(
              agencyEq(tenantApplications.agencyId),
              sql`lower(${tenantApplications.email}) = lower(${renter.email})`
            )
          )
          .orderBy(desc(tenantApplications.createdAt))
          .limit(5)
      : Promise.resolve([]),
  ]);

  return { renter, tenancies: tenancyRows, documents, applications };
}

export async function listRenterDocuments(renterId: string) {
  await ensureAgency();
  return db
    .select()
    .from(renterDocuments)
    .where(and(eq(renterDocuments.renterId, renterId), agencyEq(renterDocuments.agencyId)))
    .orderBy(asc(renterDocuments.kind), desc(renterDocuments.createdAt));
}

export async function getRenterDocument(id: string) {
  await ensureAgency();
  const [row] = await db
    .select()
    .from(renterDocuments)
    .where(and(eq(renterDocuments.id, id), agencyEq(renterDocuments.agencyId)))
    .limit(1);
  return row ?? null;
}

export async function addRenterDocument(data: {
  branchId: string;
  renterId: string;
  kind: string;
  label?: string | null;
  storageKey: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  uploadedBy?: string | null;
}) {
  await ensureAgency();
  const [row] = await db
    .insert(renterDocuments)
    .values({ agencyId: currentAgencyId(), ...data, label: data.label ?? null, uploadedBy: data.uploadedBy ?? null })
    .returning();
  return row;
}

/** Deletes the file first, so a failure never leaves a file nobody can find. */
export async function removeRenterDocument(id: string) {
  const doc = await getRenterDocument(id);
  if (!doc) return null;
  await deletePrivateFile(doc.storageKey);
  await db
    .delete(renterDocuments)
    .where(and(eq(renterDocuments.id, id), agencyEq(renterDocuments.agencyId)));
  return doc;
}

/**
 * Record a Right to Rent check on the renter. Each of their tenancies that hasn't
 * ended gets a compliance item, and time-limited permission expires on the
 * follow-up date so the existing reminders chase it.
 */
export async function recordRenterRightToRent(
  renterId: string,
  data: { checkedAt: string; method: string; expiresAt?: string | null; shareCode?: string | null },
  onlyTenancyId?: string
) {
  await ensureAgency();
  const [updated] = await db
    .update(renters)
    .set({
      rtrCheckedAt: data.checkedAt,
      rtrMethod: data.method,
      rtrExpiresAt: data.expiresAt ?? null,
      rtrShareCode: data.shareCode?.trim() || null,
    })
    .where(and(eq(renters.id, renterId), agencyEq(renters.agencyId)))
    .returning();
  if (!updated) return null;

  const open = await db
    .select({ id: tenancies.id, branchId: tenancies.branchId, propertyId: tenancies.propertyId })
    .from(tenancies)
    .where(
      and(
        agencyEq(tenancies.agencyId),
        renterOnTenancy(renterId),
        onlyTenancyId ? eq(tenancies.id, onlyTenancyId) : ne(tenancies.status, "ended")
      )
    );
  for (const t of open) {
    await createComplianceItem({
      branchId: t.branchId,
      propertyId: t.propertyId,
      tenancyId: t.id,
      type: "right_to_rent",
      issuedAt: data.checkedAt,
      expiresAt: data.expiresAt ?? null,
      reference: `${displayPersonName(updated.firstName, updated.lastName)} (${RTR_METHODS[data.method] ?? data.method}${updated.rtrShareCode ? ` ${updated.rtrShareCode}` : ""})`,
      // Time-limited permission gets expiring/expired from the date, like a certificate.
      status: data.expiresAt ? undefined : "valid",
    });
  }
  return updated;
}

/**
 * How long renter documents are kept once the renter has no tenancy running:
 * Right to Rent evidence 12 months (Home Office guidance), everything else
 * 6 years (Limitation Act). A renter who never had a tenancy is treated like an
 * unsuccessful applicant: 6 months from upload.
 */
export const RENTER_DOCUMENT_RETENTION = {
  rightToRentMonths: 12,
  otherMonths: 72,
  noTenancyMonths: 6,
} as const;

/** Renter documents past their retention period for the current agency. */
export async function listRenterDocumentsDueForDeletion(now = new Date()) {
  await ensureAgency();
  const { rightToRentMonths, otherMonths, noTenancyMonths } = RENTER_DOCUMENT_RETENTION;
  const today = now.toISOString().slice(0, 10);
  const onTenancy = sql`(t.primary_renter_id = ${renterDocuments.renterId} or exists (select 1 from tenancy_parties tp where tp.tenancy_id = t.id and tp.renter_id = ${renterDocuments.renterId} and tp.role = 'tenant'))`;
  const hasTenancy = sql`exists (select 1 from tenancies t where t.agency_id = ${renterDocuments.agencyId} and ${onTenancy})`;
  const hasOpenTenancy = sql`exists (select 1 from tenancies t where t.agency_id = ${renterDocuments.agencyId} and ${onTenancy} and (t.status <> 'ended' or t.end_date is null or t.end_date > ${today}::date))`;
  const lastEnd = sql`(select max(t.end_date) from tenancies t where t.agency_id = ${renterDocuments.agencyId} and ${onTenancy})`;

  return db
    .select({ id: renterDocuments.id, kind: renterDocuments.kind, storageKey: renterDocuments.storageKey })
    .from(renterDocuments)
    .where(
      and(
        agencyEq(renterDocuments.agencyId),
        sql`(
          (not ${hasTenancy} and ${renterDocuments.createdAt} < ${today}::date - make_interval(months => ${noTenancyMonths}::int))
          or (${hasTenancy} and not ${hasOpenTenancy} and ${lastEnd} < ${today}::date - make_interval(months => case when ${renterDocuments.kind} = 'right_to_rent' then ${rightToRentMonths}::int else ${otherMonths}::int end))
        )`
      )
    );
}
