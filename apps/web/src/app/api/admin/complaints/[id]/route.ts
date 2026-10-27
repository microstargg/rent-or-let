import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSession } from "@/lib/auth/server";
import { updateComplaint } from "@/lib/db/queries";
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
    z.object({
      status: z.enum(["open", "investigating", "resolved", "closed"]),
      resolved_at: z.string().nullable().optional(),
    })
  );
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  await updateComplaint(id, {
    status: body.status,
    resolvedAt: body.resolved_at ? new Date(body.resolved_at) : null,
  });

  return NextResponse.json({ success: true });
}
