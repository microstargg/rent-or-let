import { auth } from "@/lib/auth/instance";
import {
  getStaffProfileById,
  getRenterProfileByUserId,
  getLandlordProfileByUserId,
} from "@/lib/db/queries";

export { auth };

export async function requireStaffSession() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const staff = await getStaffProfileById(userId);
  if (!staff) return null;

  return session;
}

export async function requireRenterSession() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const profile = await getRenterProfileByUserId(userId);
  if (!profile) return null;

  return { session, profile };
}

export async function requireLandlordSession() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const profile = await getLandlordProfileByUserId(userId);
  if (!profile) return null;

  return { session, profile };
}
