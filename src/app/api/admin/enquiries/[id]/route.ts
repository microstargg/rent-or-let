import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSession } from "@/lib/auth/server";
import { updateEnquiryStatus } from "@/lib/db/queries";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = z.object({ status: z.enum(["new", "in_progress", "closed"]) }).parse(
    await request.json()
  );

  await updateEnquiryStatus(id, body.status);
  return NextResponse.json({ success: true });
}
