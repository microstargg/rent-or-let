import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { updateTaskStatus } from "@/lib/db/queries";

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "done", "cancelled"]),
});

export async function PATCH(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = patchSchema.parse(await request.json());
  const row = await updateTaskStatus(body.id, body.status);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}
