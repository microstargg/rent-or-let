import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth/server";
import { getDefaultBranch } from "@/lib/db/queries";
import { PORTAL_CONFIGS } from "@/lib/portals/rtdf-mapper";
import { getBranchPropertyList } from "@/lib/portals/rtdf-client";

export async function POST() {
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch configured" }, { status: 404 });

  const results: Record<string, { success: boolean; message?: string; count?: number }> = {};

  for (const config of PORTAL_CONFIGS) {
    const branchId =
      config.name === "rightmove"
        ? branch.rightmoveBranchId ?? process.env.RIGHTMOVE_BRANCH_ID ?? ""
        : branch.otmBranchId ?? process.env.OTM_BRANCH_ID ?? "";

    if (!branchId) {
      results[config.name] = { success: false, message: "Branch ID not configured" };
      continue;
    }

    const result = await getBranchPropertyList(config, branchId);
    results[config.name] = {
      success: result.success,
      message: result.message,
      count: result.properties?.length,
    };
  }

  return NextResponse.json({ results });
}
