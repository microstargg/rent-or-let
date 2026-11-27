import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth/server";
import { retryFailedPortalSyncs } from "@/lib/portals/retry";

export async function POST() {
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await retryFailedPortalSyncs();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[portals/retry]", error);
    return NextResponse.json({ error: "Retry failed" }, { status: 500 });
  }
}
