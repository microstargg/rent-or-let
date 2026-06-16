import type { PortalName } from "@/types";
import {
  enqueuePortalSyncJob,
  getPendingSyncJobs,
  getPropertyWithBranch,
  updateSyncJob,
} from "@/lib/db/queries";

function enabledPortalsForBranch(branch: {
  rightmoveSyncEnabled: boolean;
  otmSyncEnabled: boolean;
}): PortalName[] {
  const portals: PortalName[] = [];
  if (branch.rightmoveSyncEnabled) portals.push("rightmove");
  if (branch.otmSyncEnabled) portals.push("onthemarket");
  return portals;
}

export async function enqueuePortalSync(
  propertyId: string,
  action: "send" | "remove"
): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  const result = await getPropertyWithBranch(propertyId);
  if (!result) return;

  const portals = enabledPortalsForBranch(result.branch);
  for (const portal of portals) {
    await enqueuePortalSyncJob(propertyId, portal, action);
  }
}

export async function processPendingSyncJobs(): Promise<{
  processed: number;
  failed: number;
}> {
  const { processSyncJob } = await import("./sync-worker");
  const jobs = await getPendingSyncJobs(20);

  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    await updateSyncJob(job.id, {
      status: "processing",
      attempts: job.attempts + 1,
    });

    const result = await processSyncJob(
      job.propertyId,
      job.portal as PortalName,
      job.action as "send" | "remove"
    );

    await updateSyncJob(job.id, {
      status: result.success ? "completed" : "failed",
      attempts: job.attempts + 1,
      processedAt: new Date(),
    });

    if (result.success) processed++;
    else failed++;
  }

  return { processed, failed };
}
