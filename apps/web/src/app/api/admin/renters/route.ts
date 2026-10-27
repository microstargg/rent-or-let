import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { createRenter, listRenters, getDefaultBranch } from "@/lib/db/queries";
import { parseJsonBody } from "@/lib/api-validation";

const schema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().or(z.literal("")).nullable().optional(),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  const rows = await listRenters(branch?.id);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const branch = await getDefaultBranch();
  if (!branch) {
    return NextResponse.json({ error: "No branch configured" }, { status: 400 });
  }

  const parsed = await parseJsonBody(request, schema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const row = await createRenter({
    branchId: branch.id,
    firstName: body.first_name,
    lastName: body.last_name,
    email: body.email || null,
    phone: body.phone || null,
    notes: body.notes || null,
  });
  return NextResponse.json(row, { status: 201 });
}
