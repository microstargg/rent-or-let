import { eq, and, desc, gt, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "../index";
import { agencyEq, currentAgencyId, ensureAgency } from "../agency-scope";
import {
  enquiries,
  viewings,
  tenantApplications,
  landlordProfiles,
  landlordInvites,
  landlords,
  properties,
} from "../schema";
import { createRenter, createTenancy } from "./operations";
import { getAppUrl } from "@/lib/app-url";

export async function updateEnquiryPipeline(id: string, pipelineStage: string) {
  await ensureAgency();
  const [row] = await db
    .update(enquiries)
    .set({ pipelineStage, status: pipelineStage })
    .where(and(eq(enquiries.id, id), agencyEq(enquiries.agencyId)))
    .returning();
  return row ?? null;
}

export async function createViewing(data: {
  branchId: string;
  propertyId: string;
  enquiryId?: string | null;
  scheduledAt: Date;
  notes?: string | null;
}) {
  await ensureAgency();
  const [row] = await db
    .insert(viewings)
    .values({
      agencyId: currentAgencyId(),
      branchId: data.branchId,
      propertyId: data.propertyId,
      enquiryId: data.enquiryId ?? null,
      scheduledAt: data.scheduledAt,
      notes: data.notes ?? null,
    })
    .returning();

  if (data.enquiryId) {
    await updateEnquiryPipeline(data.enquiryId, "viewing_booked");
  }
  return row;
}

export async function listViewings(branchId: string) {
  await ensureAgency();
  return db
    .select({
      viewing: viewings,
      propertyAddress: properties.displayAddress,
    })
    .from(viewings)
    .innerJoin(properties, eq(viewings.propertyId, properties.id))
    .where(and(eq(viewings.branchId, branchId), agencyEq(viewings.agencyId)))
    .orderBy(desc(viewings.scheduledAt));
}

export async function updateApplicationReferencing(
  id: string,
  referencingStatus: string,
  details?: { provider?: string | null; reference?: string | null; note?: string | null }
) {
  await ensureAgency();
  const current = details ? await getApplicationById(id) : null;
  const referenceData = current
    ? {
        ...((current.referenceData ?? {}) as Record<string, unknown>),
        ...(details?.provider !== undefined && { provider: details.provider }),
        ...(details?.reference !== undefined && { reference: details.reference }),
        ...(details?.note !== undefined && { note: details.note }),
        updatedAt: new Date().toISOString(),
      }
    : undefined;
  const [row] = await db
    .update(tenantApplications)
    .set({ referencingStatus, ...(referenceData && { referenceData }) })
    .where(and(eq(tenantApplications.id, id), agencyEq(tenantApplications.agencyId)))
    .returning();
  return row ?? null;
}

export async function getApplicationById(id: string) {
  await ensureAgency();
  const [row] = await db
    .select()
    .from(tenantApplications)
    .where(and(eq(tenantApplications.id, id), agencyEq(tenantApplications.agencyId)))
    .limit(1);
  return row ?? null;
}

export async function convertApplicationToTenancy(
  applicationId: string,
  opts: { branchId: string; rentAmount?: number; startDate: string; depositAmount?: number }
) {
  await ensureAgency();
  const app = await getApplicationById(applicationId);
  if (!app || !app.propertyId) throw new Error("Application missing property");
  const [property] = await db
    .select({ pricePcm: properties.pricePcm, deposit: properties.deposit })
    .from(properties)
    .where(and(eq(properties.id, app.propertyId), agencyEq(properties.agencyId)))
    .limit(1);
  const rentAmount = opts.rentAmount ?? Number(property?.pricePcm ?? 0);
  if (!rentAmount) throw new Error("Set the rent on the property first");
  const depositAmount = opts.depositAmount ?? (property?.deposit ? Number(property.deposit) : undefined);

  const renter = await createRenter({
    branchId: opts.branchId,
    firstName: app.firstName,
    lastName: app.lastName,
    email: app.email,
    phone: app.phone,
  });

  const tenancy = await createTenancy({
    branchId: opts.branchId,
    propertyId: app.propertyId,
    primaryRenterId: renter.id,
    rentAmount,
    depositAmount,
    startDate: opts.startDate,
  });

  const holdingApplied =
    app.holdingDepositPaidAt && !app.holdingDepositOutcome
      ? {
          holdingDepositOutcome: "applied",
          holdingDepositOutcomeAt: new Date().toISOString().slice(0, 10),
          holdingDepositNote: "Put towards the first payment when the tenancy was created.",
        }
      : {};
  await db
    .update(tenantApplications)
    .set({ status: "approved", referencingStatus: "complete", ...holdingApplied })
    .where(and(eq(tenantApplications.id, applicationId), agencyEq(tenantApplications.agencyId)));

  return { renter, tenancy };
}

export async function createLandlordProfile(data: {
  userId: string;
  branchId: string;
  landlordId: string;
  email: string;
}) {
  await ensureAgency();
  const [row] = await db
    .insert(landlordProfiles)
    .values({
      agencyId: currentAgencyId(),
      id: data.userId,
      branchId: data.branchId,
      landlordId: data.landlordId,
      email: data.email,
    })
    .returning();
  return row;
}

export async function getLandlordProfileByUserId(userId: string) {
  await ensureAgency();
  const [row] = await db
    .select({
      profile: landlordProfiles,
      landlord: landlords,
    })
    .from(landlordProfiles)
    .innerJoin(landlords, eq(landlordProfiles.landlordId, landlords.id))
    .where(and(eq(landlordProfiles.id, userId), agencyEq(landlordProfiles.agencyId)))
    .limit(1);
  return row ?? null;
}

export async function getLandlordProfileByLandlordId(landlordId: string) {
  await ensureAgency();
  const [row] = await db
    .select({
      profile: landlordProfiles,
      landlord: landlords,
    })
    .from(landlordProfiles)
    .innerJoin(landlords, eq(landlordProfiles.landlordId, landlords.id))
    .where(and(eq(landlordProfiles.landlordId, landlordId), agencyEq(landlordProfiles.agencyId)))
    .limit(1);
  return row ?? null;
}

export async function createLandlordInvite(data: {
  branchId: string;
  landlordId: string;
  email: string;
  token: string;
  expiresAt: Date;
}) {
  await ensureAgency();
  const [row] = await db
    .insert(landlordInvites)
    .values({
      agencyId: currentAgencyId(),
      ...data,
    })
    .returning();
  return row;
}

export async function issueLandlordPortalInvite(data: {
  branchId: string;
  landlordId: string;
  email: string;
}) {
  await ensureAgency();
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);
  const invite = await createLandlordInvite({
    branchId: data.branchId,
    landlordId: data.landlordId,
    email: data.email,
    token,
    expiresAt,
  });
  return {
    invite,
    url: `${getAppUrl()}/accept-landlord-invite?token=${token}`,
  };
}

export async function getLandlordInviteByToken(token: string) {
  await ensureAgency();
  const [row] = await db
    .select()
    .from(landlordInvites)
    .where(
      and(
        eq(landlordInvites.token, token),
        gt(landlordInvites.expiresAt, new Date()),
        isNull(landlordInvites.acceptedAt),
        agencyEq(landlordInvites.agencyId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function acceptLandlordInvite(inviteId: string) {
  await ensureAgency();
  await db
    .update(landlordInvites)
    .set({ acceptedAt: new Date() })
    .where(and(eq(landlordInvites.id, inviteId), agencyEq(landlordInvites.agencyId)));
}

export async function listPropertiesForLandlord(landlordId: string) {
  await ensureAgency();
  return db
    .select()
    .from(properties)
    .where(and(eq(properties.landlordId, landlordId), agencyEq(properties.agencyId)));
}

export async function updateHoldingDeposit(
  id: string,
  data: {
    amount?: number | null;
    paidAt?: string | null;
    outcome?: string | null;
    note?: string | null;
  }
) {
  await ensureAgency();
  const [row] = await db
    .update(tenantApplications)
    .set({
      ...(data.amount !== undefined && { holdingDepositAmount: data.amount == null ? null : String(data.amount) }),
      ...(data.paidAt !== undefined && { holdingDepositPaidAt: data.paidAt }),
      ...(data.outcome !== undefined && {
        holdingDepositOutcome: data.outcome,
        holdingDepositOutcomeAt: data.outcome ? new Date().toISOString().slice(0, 10) : null,
      }),
      ...(data.note !== undefined && { holdingDepositNote: data.note }),
    })
    .where(and(eq(tenantApplications.id, id), agencyEq(tenantApplications.agencyId)))
    .returning();
  return row ?? null;
}
