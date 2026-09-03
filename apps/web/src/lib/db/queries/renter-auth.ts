import { eq, and, gt, isNull } from "drizzle-orm";
import { db } from "../index";
import { renterProfiles, renterInvites, renters } from "../schema";

export async function getRenterProfileByUserId(userId: string) {
  const [row] = await db
    .select({
      profile: renterProfiles,
      renter: renters,
    })
    .from(renterProfiles)
    .innerJoin(renters, eq(renterProfiles.renterId, renters.id))
    .where(eq(renterProfiles.id, userId))
    .limit(1);
  return row ?? null;
}

export async function createRenterProfile(data: {
  userId: string;
  branchId: string;
  renterId: string;
  email: string;
}) {
  const [row] = await db
    .insert(renterProfiles)
    .values({
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
  const [row] = await db
    .insert(renterInvites)
    .values({
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
  const [row] = await db
    .select()
    .from(renterInvites)
    .where(
      and(eq(renterInvites.token, token), gt(renterInvites.expiresAt, new Date()), isNull(renterInvites.acceptedAt))
    )
    .limit(1);
  return row ?? null;
}

export async function acceptRenterInvite(inviteId: string) {
  await db
    .update(renterInvites)
    .set({ acceptedAt: new Date() })
    .where(eq(renterInvites.id, inviteId));
}

export async function listPendingRenterInvites(branchId: string) {
  return db
    .select({
      invite: renterInvites,
      renterFirstName: renters.firstName,
      renterLastName: renters.lastName,
    })
    .from(renterInvites)
    .innerJoin(renters, eq(renterInvites.renterId, renters.id))
    .where(and(eq(renterInvites.branchId, branchId), isNull(renterInvites.acceptedAt)))
    .orderBy(renterInvites.createdAt);
}
