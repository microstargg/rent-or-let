import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { updateLandlord, deleteLandlord } from "@/lib/db/queries";
import { parseJsonBody } from "@/lib/api-validation";
import { landlordMoneyFields } from "@/lib/finance/landlord-fields";

const schema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  prs_registration_number: z.string().max(40).optional().nullable(),
  service_level: z.enum(["fully_managed", "rent_collection", "let_only"]).nullable().optional(),
  fee_percent: z.number().min(0).max(50).nullable().optional(),
  letting_fee: z.number().min(0).max(100000).nullable().optional(),
  nrl_status: z.enum(["approved", "withhold"]).or(z.literal("")).nullable().optional(),
  nrl_approval_ref: z.string().max(40).nullable().optional(),
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
  const row = await updateLandlord(id, {
    ...(body.first_name && { firstName: body.first_name }),
    ...(body.last_name && { lastName: body.last_name }),
    ...(body.email !== undefined && { email: body.email }),
    ...(body.phone !== undefined && { phone: body.phone }),
    ...(body.notes !== undefined && { notes: body.notes }),
    ...(body.prs_registration_number !== undefined && {
      prsRegistrationNumber: body.prs_registration_number?.trim() || null,
    }),
    ...landlordMoneyFields(body),
  });
  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  await deleteLandlord(id);
  return NextResponse.json({ success: true });
}
