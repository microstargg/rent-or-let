import { auth } from "@/lib/auth/instance";
import { bindRequestAgency } from "@/lib/agency";
import {
  getRenterProfileByUserId,
  getLandlordProfileByUserId,
  ensureStaffMembership,
} from "@/lib/db/queries";

export { auth };

export async function requireStaffSession() {
  await bindRequestAgency();
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const staff = await ensureStaffMembership(userId, session.user.email);
  if (!staff) return null;

  return session;
}

export async function requireRenterSession() {
  await bindRequestAgency();
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const profile = await getRenterProfileByUserId(userId);
  if (!profile) return null;

  return { session, profile };
}

export async function requireLandlordSession() {
  await bindRequestAgency();
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const profile = await getLandlordProfileByUserId(userId);
  if (!profile) return null;

  return { session, profile };
}
