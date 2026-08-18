import { NextResponse } from "next/server";
import { requireRenterSession } from "@/lib/auth/server";
import {
  getActiveTenancyForRenter,
  createPetRequest,
  listPetRequestsForRenter,
} from "@/lib/db/queries";

export async function GET() {
  const ctx = await requireRenterSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await listPetRequestsForRenter(ctx.profile.profile.renterId);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const ctx = await requireRenterSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenancy = await getActiveTenancyForRenter(
    ctx.profile.profile.renterId,
    ctx.profile.profile.branchId
  );
  if (!tenancy) {
    return NextResponse.json({ error: "No active tenancy" }, { status: 400 });
  }
  const body = (await request.json()) as { pet_description?: string };
  if (!body.pet_description?.trim()) {
    return NextResponse.json({ error: "Describe the pet" }, { status: 400 });
  }
  const row = await createPetRequest({
    branchId: ctx.profile.profile.branchId,
    tenancyId: tenancy.id,
    renterId: ctx.profile.profile.renterId,
    petDescription: body.pet_description,
  });
  return NextResponse.json(row, { status: 201 });
}
