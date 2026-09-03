import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { createLandlord, listLandlords, getDefaultBranch } from "@/lib/db/queries";

const schema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  const rows = await listLandlords(branch?.id);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const branch = await getDefaultBranch();
  if (!branch) {
    return NextResponse.json({ error: "No branch configured" }, { status: 400 });
  }

  const body = schema.parse(await request.json());
  const row = await createLandlord({
    branchId: branch.id,
    firstName: body.first_name,
    lastName: body.last_name,
    email: body.email || null,
    phone: body.phone || null,
    notes: body.notes || null,
  });
  return NextResponse.json(row, { status: 201 });
}
