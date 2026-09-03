import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSession } from "@/lib/auth/server";
import { updateApplicationStatus } from "@/lib/db/queries";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = z
    .object({ status: z.enum(["submitted", "reviewing", "approved", "rejected"]) })
    .parse(await request.json());

  await updateApplicationStatus(id, body.status);
  return NextResponse.json({ success: true });
}
