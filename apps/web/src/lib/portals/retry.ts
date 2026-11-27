import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencyEq, ensureAgency } from "@/lib/db/agency-scope";
import { properties, branches } from "@/lib/db/schema";
import { inDemoAgency } from "@/lib/demo/server";
import type { PortalName } from "@/types";
import { PORTAL_CONFIGS } from "./rtdf-mapper";
import { isPortalConfigured } from "./rtdf-http";
import { processSyncJob } from "./sync-worker";

/** Most properties retried in one run, so a long outage can't make the cron time out. */
const MAX_PER_RUN = 50;

export interface RetryResult {
  checked: number;
  retried: number;
  succeeded: number;
  failed: number;
}

/**
 * Sends again every listing whose last send to a portal failed (portal down,
 * credentials added later, a rejected field that has since been fixed).
 * Available properties are re-sent; anything else is removed from the portal.
 * Only portals that are switched on for the branch and have credentials are tried.
 */
export async function retryFailedPortalSyncs(): Promise<RetryResult> {
  const result: RetryResult = { checked: 0, retried: 0, succeeded: 0, failed: 0 };
  if (!process.env.DATABASE_URL || inDemoAgency()) return result;
  await ensureAgency();

  const rows = await db
    .select({
      id: properties.id,
      status: properties.status,
      portalSync: properties.portalSync,
      rightmoveSyncEnabled: branches.rightmoveSyncEnabled,
      otmSyncEnabled: branches.otmSyncEnabled,
    })
    .from(properties)
    .innerJoin(branches, eq(properties.branchId, branches.id))
    .where(
      and(
        agencyEq(properties.agencyId),
        sql`jsonb_path_exists(${properties.portalSync}, '$.* ? (@.status == "failed")')`
      )
    )
    .orderBy(properties.updatedAt)
    .limit(MAX_PER_RUN);

  result.checked = rows.length;

  for (const row of rows) {
    const sync = (row.portalSync ?? {}) as Record<string, { status?: string }>;
    const enabled: Partial<Record<PortalName, boolean>> = {
      rightmove: row.rightmoveSyncEnabled,
      onthemarket: row.otmSyncEnabled,
    };
    const action = row.status === "available" ? "send" : "remove";

    for (const config of PORTAL_CONFIGS) {
      if (sync[config.name]?.status !== "failed") continue;
      if (!enabled[config.name] || !isPortalConfigured(config)) continue;
      result.retried++;
      try {
        const res = await processSyncJob(row.id, config.name, action);
        if (res.success) result.succeeded++;
        else result.failed++;
      } catch (error) {
        result.failed++;
        console.error(`[portal-retry] ${row.id} (${config.name}) failed`, error);
      }
    }
  }

  return result;
}
