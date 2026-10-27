import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { deleteContractor, updateContractor } from "@/lib/db/queries";
import { parseJsonBody } from "@/lib/api-validation";

const schema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().or(z.literal("")).nullable().optional(),
  phone: z.string().nullable().optional(),
  trade: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const parsed = await parseJsonBody(request, schema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const row = await updateContractor(id, {
    ...(body.name && { name: body.name }),
    ...(body.email !== undefined && { email: body.email || null }),
    ...(body.phone !== undefined && { phone: body.phone || null }),
    ...(body.trade !== undefined && { trade: body.trade || null }),
    ...(body.notes !== undefined && { notes: body.notes || null }),
  });
  if (!row) return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  await deleteContractor(id);
  return NextResponse.json({ success: true });
}
