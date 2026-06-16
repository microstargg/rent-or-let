import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth/server";
import { enqueuePortalSync } from "@/lib/portals/sync-queue";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await enqueuePortalSync(id, "send");
  return NextResponse.json({ success: true });
}
