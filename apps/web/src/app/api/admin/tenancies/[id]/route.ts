import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { endTenancy } from "@/lib/db/queries";
import { parseJsonBody } from "@/lib/api-validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { id } = await params;
  const parsed = await parseJsonBody(request, z.object({ action: z.literal("end") }));
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  if (body.action === "end") {
    const row = await endTenancy(id);
    return NextResponse.json(row);
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
