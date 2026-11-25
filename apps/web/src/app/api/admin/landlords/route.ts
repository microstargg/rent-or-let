import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { createLandlord, listLandlords, getDefaultBranch } from "@/lib/db/queries";
import { parseJsonBody } from "@/lib/api-validation";
import { landlordMoneyFields } from "@/lib/finance/landlord-fields";

const schema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().or(z.literal("")).nullable().optional(),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  prs_registration_number: z.string().max(40).nullable().optional(),
  service_level: z.enum(["fully_managed", "rent_collection", "let_only"]).nullable().optional(),
  fee_percent: z.number().min(0).max(50).nullable().optional(),
  letting_fee: z.number().min(0).max(100000).nullable().optional(),
  nrl_status: z.enum(["approved", "withhold"]).or(z.literal("")).nullable().optional(),
  nrl_approval_ref: z.string().max(40).nullable().optional(),
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

  const parsed = await parseJsonBody(request, schema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const row = await createLandlord({
    branchId: branch.id,
    firstName: body.first_name,
    lastName: body.last_name,
    email: body.email || null,
    phone: body.phone || null,
    notes: body.notes || null,
    prsRegistrationNumber: body.prs_registration_number?.trim() || null,
    ...landlordMoneyFields(body),
  });
  return NextResponse.json(row, { status: 201 });
}
