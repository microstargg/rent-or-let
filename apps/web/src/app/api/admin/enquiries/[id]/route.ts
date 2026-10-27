import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSession } from "@/lib/auth/server";
import { updateEnquiryStatus } from "@/lib/db/queries";
import { parseJsonBody } from "@/lib/api-validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(
    request,
    z.object({ status: z.enum(["new", "in_progress", "closed"]) })
  );
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  await updateEnquiryStatus(id, body.status);
  return NextResponse.json({ success: true });
}
