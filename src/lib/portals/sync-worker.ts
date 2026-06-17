import {
  getPropertyWithBranch,
  insertPortalSyncLog,
  updateProperty,
} from "@/lib/db/queries";
import {
  PORTAL_CONFIGS,
  mapPropertyToRTDF,
  type PortalConfig,
} from "./rtdf-mapper";
import { sendProperty, removeProperty } from "./rtdf-client";
import type { PortalName } from "@/types";

function enabledPortalsForBranch(branch: {
  rightmoveSyncEnabled: boolean;
  otmSyncEnabled: boolean;
}): PortalName[] {
  const portals: PortalName[] = [];
  if (branch.rightmoveSyncEnabled) portals.push("rightmove");
  if (branch.otmSyncEnabled) portals.push("onthemarket");
  return portals;
}

export async function syncPropertyToPortals(
  propertyId: string,
  action: "send" | "remove"
): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  const result = await getPropertyWithBranch(propertyId);
  if (!result) return;

  for (const portal of enabledPortalsForBranch(result.branch)) {
    try {
      await processSyncJob(propertyId, portal, action);
    } catch (error) {
      console.error(`Portal sync failed for ${propertyId} (${portal}):`, error);
    }
  }
}

export async function syncPropertyToPortal(
  propertyId: string,
  portal: PortalName,
  action: "send" | "remove"
): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  try {
    await processSyncJob(propertyId, portal, action);
  } catch (error) {
    console.error(`Portal sync failed for ${propertyId} (${portal}):`, error);
  }
}

export async function processSyncJob(
  propertyId: string,
  portal: PortalName,
  action: "send" | "remove"
): Promise<{ success: boolean; message?: string }> {
  const result = await getPropertyWithBranch(propertyId);
  if (!result) return { success: false, message: "Property not found" };

  const { property, branch } = result;
  const config = PORTAL_CONFIGS.find((c) => c.name === portal);
  if (!config) return { success: false, message: "Unknown portal" };

  const branchId =
    portal === "rightmove"
      ? branch.rightmoveBranchId ?? process.env.RIGHTMOVE_BRANCH_ID ?? ""
      : branch.otmBranchId ?? process.env.OTM_BRANCH_ID ?? "";

  let syncResult: { success: boolean; message?: string; external_id?: string; raw?: unknown };

  if (action === "remove") {
    syncResult = await removeProperty(config, config.networkId, branchId, property.agent_ref);
  } else {
    const payload = mapPropertyToRTDF(property, config.networkId, branchId);
    syncResult = await sendProperty(config, payload, branchId);
  }

  await insertPortalSyncLog({
    propertyId,
    portal,
    action,
    status: syncResult.success ? "success" : "failed",
    errorMessage: syncResult.message ?? null,
    responsePayload: syncResult.raw ? (syncResult.raw as Record<string, unknown>) : null,
  });

  const portalSync = { ...property.portal_sync };
  portalSync[portal] = {
    status: syncResult.success ? "success" : "failed",
    last_synced_at: new Date().toISOString(),
    error: syncResult.message,
    ...(syncResult.external_id ? { external_id: syncResult.external_id } : {}),
  };

  await updateProperty(propertyId, { portalSync });

  return syncResult;
}

export async function reconcileBranch(config: PortalConfig, branchId: string) {
  const { getBranchPropertyList } = await import("./rtdf-client");
  return getBranchPropertyList(config, branchId);
}
