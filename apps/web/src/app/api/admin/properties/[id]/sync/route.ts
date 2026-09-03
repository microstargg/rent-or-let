import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth/server";
import { syncPropertyToPortals } from "@/lib/portals/sync-worker";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await syncPropertyToPortals(id, "send");
  if (result.blocked) {
    return NextResponse.json(result, { status: 409 });
  }
  return NextResponse.json({ success: true });
}
