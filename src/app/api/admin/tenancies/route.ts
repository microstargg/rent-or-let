import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { createTenancy, getDefaultBranch } from "@/lib/db/queries";

const schema = z.object({
  property_id: z.string().uuid(),
  primary_renter_id: z.string().uuid(),
  rent_amount: z.number().positive(),
  deposit_amount: z.number().optional().nullable(),
  start_date: z.string(),
  end_date: z.string().optional().nullable(),
  deposit_scheme: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const branch = await getDefaultBranch();
  if (!branch) {
    return NextResponse.json({ error: "No branch configured" }, { status: 400 });
  }

  const body = schema.parse(await request.json());
  const row = await createTenancy({
    branchId: branch.id,
    propertyId: body.property_id,
    primaryRenterId: body.primary_renter_id,
    rentAmount: body.rent_amount,
    depositAmount: body.deposit_amount,
    startDate: body.start_date,
    endDate: body.end_date,
    depositScheme: body.deposit_scheme,
  });
  return NextResponse.json(row, { status: 201 });
}
