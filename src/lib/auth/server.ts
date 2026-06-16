import { createNeonAuth } from "@neondatabase/neon-js/auth/next/server";
import { getStaffProfileById } from "@/lib/db/queries";
import { authEnv } from "./env";

export const auth = createNeonAuth({
  baseUrl: authEnv.baseUrl,
  cookies: {
    secret: authEnv.cookieSecret,
  },
});

export async function requireStaffSession() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const staff = await getStaffProfileById(userId);
  if (!staff) return null;

  return session;
}
