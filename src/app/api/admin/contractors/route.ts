import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { createContractor, listContractors, getDefaultBranch } from "@/lib/db/queries";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  trade: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json([]);
  const rows = await listContractors(branch.id);
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
  const row = await createContractor({
    branchId: branch.id,
    name: body.name,
    email: body.email || null,
    phone: body.phone || null,
    trade: body.trade || null,
    notes: body.notes || null,
  });
  return NextResponse.json(row, { status: 201 });
}
