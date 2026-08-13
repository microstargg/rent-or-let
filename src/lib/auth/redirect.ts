import {
  getStaffProfileById,
  getRenterProfileByUserId,
  getLandlordProfileByUserId,
} from "@/lib/db/queries";

export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const next = value.trim();
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  if (next.includes("://") || next.includes("\\")) return null;
  return next;
}

export async function resolvePostLoginPath(
  userId: string,
  next?: string | null
): Promise<string> {
  const safe = safeNextPath(next);
  if (safe) return safe;

  if (await getStaffProfileById(userId)) return "/admin";
  if (await getLandlordProfileByUserId(userId)) return "/landlord-portal";
  if (await getRenterProfileByUserId(userId)) return "/portal";
  return "/login?error=no-access";
}
