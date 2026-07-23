import { and, eq, gt, isNull, desc } from "drizzle-orm";
import { db } from "../index";
import { staffInvites, staffProfiles } from "../schema";

export async function listStaffProfiles() {
  return db.select().from(staffProfiles).orderBy(desc(staffProfiles.createdAt));
}

export async function createStaffProfile(data: {
  userId: string;
  email: string;
  fullName: string;
  role?: string;
}) {
  const [row] = await db
    .insert(staffProfiles)
    .values({
      id: data.userId,
      email: data.email,
      fullName: data.fullName,
      role: data.role ?? "staff",
    })
    .returning();
  return row;
}

export async function getStaffProfileByEmail(email: string) {
  const [row] = await db
    .select()
    .from(staffProfiles)
    .where(eq(staffProfiles.email, email.toLowerCase()))
    .limit(1);
  return row ?? null;
}

export async function createStaffInvite(data: {
  email: string;
  fullName: string;
  role?: string;
  token: string;
  expiresAt: Date;
}) {
  const [row] = await db
    .insert(staffInvites)
    .values({
      email: data.email.toLowerCase(),
      fullName: data.fullName,
      role: data.role ?? "staff",
      token: data.token,
      expiresAt: data.expiresAt,
    })
    .returning();
  return row;
}

export async function getStaffInviteByToken(token: string) {
  const [row] = await db
    .select()
    .from(staffInvites)
    .where(
      and(
        eq(staffInvites.token, token),
        gt(staffInvites.expiresAt, new Date()),
        isNull(staffInvites.acceptedAt)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function acceptStaffInvite(inviteId: string) {
  await db
    .update(staffInvites)
    .set({ acceptedAt: new Date() })
    .where(eq(staffInvites.id, inviteId));
}

export async function listPendingStaffInvites() {
  return db
    .select()
    .from(staffInvites)
    .where(and(isNull(staffInvites.acceptedAt), gt(staffInvites.expiresAt, new Date())))
    .orderBy(desc(staffInvites.createdAt));
}
