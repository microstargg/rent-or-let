import { eq, and, desc, gt, isNull } from "drizzle-orm";
import { db } from "../index";
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

export async function updateEnquiryPipeline(id: string, pipelineStage: string) {
  const [row] = await db
    .update(enquiries)
    .set({ pipelineStage, status: pipelineStage })
    .where(eq(enquiries.id, id))
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
  const [row] = await db
    .insert(viewings)
    .values({
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
  return db
    .select({
      viewing: viewings,
      propertyAddress: properties.displayAddress,
    })
    .from(viewings)
    .innerJoin(properties, eq(viewings.propertyId, properties.id))
    .where(eq(viewings.branchId, branchId))
    .orderBy(desc(viewings.scheduledAt));
}

export async function updateApplicationReferencing(id: string, referencingStatus: string) {
  const [row] = await db
    .update(tenantApplications)
    .set({ referencingStatus })
    .where(eq(tenantApplications.id, id))
    .returning();
  return row ?? null;
}

export async function getApplicationById(id: string) {
  const [row] = await db
    .select()
    .from(tenantApplications)
    .where(eq(tenantApplications.id, id))
    .limit(1);
  return row ?? null;
}

export async function convertApplicationToTenancy(
  applicationId: string,
  opts: { branchId: string; rentAmount: number; startDate: string; depositAmount?: number }
) {
  const app = await getApplicationById(applicationId);
  if (!app || !app.propertyId) throw new Error("Application missing property");

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
    rentAmount: opts.rentAmount,
    depositAmount: opts.depositAmount,
    startDate: opts.startDate,
  });

  await db
    .update(tenantApplications)
    .set({ status: "approved", referencingStatus: "complete" })
    .where(eq(tenantApplications.id, applicationId));

  return { renter, tenancy };
}

export async function createLandlordProfile(data: {
  userId: string;
  branchId: string;
  landlordId: string;
  email: string;
}) {
  const [row] = await db
    .insert(landlordProfiles)
    .values({
      id: data.userId,
      branchId: data.branchId,
      landlordId: data.landlordId,
      email: data.email,
    })
    .returning();
  return row;
}

export async function getLandlordProfileByUserId(userId: string) {
  const [row] = await db
    .select({
      profile: landlordProfiles,
      landlord: landlords,
    })
    .from(landlordProfiles)
    .innerJoin(landlords, eq(landlordProfiles.landlordId, landlords.id))
    .where(eq(landlordProfiles.id, userId))
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
  const [row] = await db.insert(landlordInvites).values(data).returning();
  return row;
}

export async function getLandlordInviteByToken(token: string) {
  const [row] = await db
    .select()
    .from(landlordInvites)
    .where(
      and(
        eq(landlordInvites.token, token),
        gt(landlordInvites.expiresAt, new Date()),
        isNull(landlordInvites.acceptedAt)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function acceptLandlordInvite(inviteId: string) {
  await db
    .update(landlordInvites)
    .set({ acceptedAt: new Date() })
    .where(eq(landlordInvites.id, inviteId));
}

export async function listPropertiesForLandlord(landlordId: string) {
  return db.select().from(properties).where(eq(properties.landlordId, landlordId));
}
