import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { endTenancy } from "@/lib/db/queries";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { id } = await params;
  const body = z.object({ action: z.literal("end") }).parse(await request.json());
  if (body.action === "end") {
    const row = await endTenancy(id);
    return NextResponse.json(row);
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
