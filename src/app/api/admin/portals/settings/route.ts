import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSession } from "@/lib/auth/server";
import {
  getDefaultBranch,
  updateBranchPortalSettings,
  listAvailablePropertyIds,
  enqueuePortalSyncJob,
} from "@/lib/db/queries";

const settingsSchema = z.object({
  rightmove_sync_enabled: z.boolean().optional(),
  otm_sync_enabled: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch configured" }, { status: 404 });

  try {
    const body = await request.json();
    const data = settingsSchema.parse(body);

    const turningOffRightmove =
      data.rightmove_sync_enabled === false && branch.rightmoveSyncEnabled;
    const turningOffOtm = data.otm_sync_enabled === false && branch.otmSyncEnabled;
    const turningOnRightmove =
      data.rightmove_sync_enabled === true && !branch.rightmoveSyncEnabled;
    const turningOnOtm = data.otm_sync_enabled === true && !branch.otmSyncEnabled;

    await updateBranchPortalSettings(branch.id, {
      rightmoveSyncEnabled: data.rightmove_sync_enabled,
      otmSyncEnabled: data.otm_sync_enabled,
    });

    if (turningOffRightmove || turningOffOtm || turningOnRightmove || turningOnOtm) {
      const propertyIds = await listAvailablePropertyIds();
      for (const propertyId of propertyIds) {
        if (turningOffRightmove) {
          await enqueuePortalSyncJob(propertyId, "rightmove", "remove");
        }
        if (turningOffOtm) {
          await enqueuePortalSyncJob(propertyId, "onthemarket", "remove");
        }
        if (turningOnRightmove) {
          await enqueuePortalSyncJob(propertyId, "rightmove", "send");
        }
        if (turningOnOtm) {
          await enqueuePortalSyncJob(propertyId, "onthemarket", "send");
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 400 });
  }
}
