import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { createContractor, listContractors, getDefaultBranch } from "@/lib/db/queries";
import { parseJsonBody } from "@/lib/api-validation";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().or(z.literal("")).nullable().optional(),
  phone: z.string().nullable().optional(),
  trade: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
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

  const parsed = await parseJsonBody(request, schema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
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
