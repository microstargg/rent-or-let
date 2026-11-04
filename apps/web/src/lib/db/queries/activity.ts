import { and, desc, eq, or } from "drizzle-orm";
import { db } from "../index";
import { agencyEq, currentAgencyId, ensureAgency } from "../agency-scope";
import { activityLog } from "../schema";

export interface Actor {
  id?: string | null;
  name?: string | null;
  email?: string | null;
}

/** The signed-in staff member, from a requireAdminApi() session. */
export function actorOf(
  session: { user?: { id?: string | null; name?: string | null; email?: string | null } } | null | undefined
): Actor | null {
  const u = session?.user;
  if (!u) return null;
  return { id: u.id ?? null, name: u.name || u.email || null, email: u.email ?? null };
}

export interface ActivityEntry {
  entityType: string;
  entityId?: string | null;
  propertyId?: string | null;
  tenancyId?: string | null;
  branchId?: string | null;
  action: string;
  summary: string;
  meta?: Record<string, unknown>;
}

/**
 * Record what happened and who did it. Never throws: a failed log line must not
 * undo the change it describes.
 */
export async function logActivity(actor: Actor | null, entry: ActivityEntry): Promise<void> {
  try {
    await ensureAgency();
    await db.insert(activityLog).values({
      agencyId: currentAgencyId(),
      branchId: entry.branchId ?? null,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      propertyId: entry.propertyId ?? null,
      tenancyId: entry.tenancyId ?? null,
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? (actor ? null : "System"),
      action: entry.action,
      summary: entry.summary.slice(0, 500),
      meta: entry.meta ?? {},
    });
  } catch (err) {
    console.error("[activity] could not record", entry.action, err);
  }
}

export async function listActivity(
  scope: { propertyId?: string; tenancyId?: string; entityId?: string },
  limit = 50
) {
  await ensureAgency();
  const filters = [
    scope.propertyId ? eq(activityLog.propertyId, scope.propertyId) : undefined,
    scope.tenancyId ? eq(activityLog.tenancyId, scope.tenancyId) : undefined,
    scope.entityId ? eq(activityLog.entityId, scope.entityId) : undefined,
  ].filter(Boolean);
  if (!filters.length) return [];
  return db
    .select()
    .from(activityLog)
    .where(and(agencyEq(activityLog.agencyId), filters.length === 1 ? filters[0] : or(...filters)))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}
