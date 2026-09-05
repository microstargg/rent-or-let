import { eq, and, gt, isNull } from "drizzle-orm";
import { db } from "../index";
import { agencyEq, currentAgencyId, ensureAgency } from "../agency-scope";
import { renterProfiles, renterInvites, renters } from "../schema";

export async function getRenterProfileByUserId(userId: string) {
  await ensureAgency();
  const [row] = await db
    .select({
      profile: renterProfiles,
      renter: renters,
    })
    .from(renterProfiles)
    .innerJoin(renters, eq(renterProfiles.renterId, renters.id))
    .where(and(eq(renterProfiles.id, userId), agencyEq(renterProfiles.agencyId)))
    .limit(1);
  return row ?? null;
}

export async function createRenterProfile(data: {
  userId: string;
  branchId: string;
  renterId: string;
  email: string;
}) {
  await ensureAgency();
  const [row] = await db
    .insert(renterProfiles)
    .values({
      agencyId: currentAgencyId(),
      id: data.userId,
      branchId: data.branchId,
      renterId: data.renterId,
      email: data.email,
    })
    .returning();
  return row;
}

export async function createRenterInvite(data: {
  branchId: string;
  renterId: string;
  email: string;
  token: string;
  expiresAt: Date;
}) {
  await ensureAgency();
  const [row] = await db
    .insert(renterInvites)
    .values({
      agencyId: currentAgencyId(),
      branchId: data.branchId,
      renterId: data.renterId,
      email: data.email,
      token: data.token,
      expiresAt: data.expiresAt,
    })
    .returning();
  return row;
}

export async function getRenterInviteByToken(token: string) {
  await ensureAgency();
  const [row] = await db
    .select()
    .from(renterInvites)
    .where(
      and(
        eq(renterInvites.token, token),
        gt(renterInvites.expiresAt, new Date()),
        isNull(renterInvites.acceptedAt),
        agencyEq(renterInvites.agencyId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function acceptRenterInvite(inviteId: string) {
  await ensureAgency();
  await db
    .update(renterInvites)
    .set({ acceptedAt: new Date() })
    .where(and(eq(renterInvites.id, inviteId), agencyEq(renterInvites.agencyId)));
}

export async function listPendingRenterInvites(branchId: string) {
  await ensureAgency();
  return db
    .select({
      invite: renterInvites,
      renterFirstName: renters.firstName,
      renterLastName: renters.lastName,
    })
    .from(renterInvites)
    .innerJoin(renters, eq(renterInvites.renterId, renters.id))
    .where(
      and(
        eq(renterInvites.branchId, branchId),
        isNull(renterInvites.acceptedAt),
        agencyEq(renterInvites.agencyId)
      )
    )
    .orderBy(renterInvites.createdAt);
}
