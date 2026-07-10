import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import {
  getDefaultBranch,
  protectDeposit,
  createInspection,
  completeInspection,
  createNotice,
  bulkServeRraInfoSheet,
  setRentReviewDate,
} from "@/lib/db/queries";

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });

  const body = (await request.json()) as {
    action?: string;
    tenancy_id?: string;
    scheme?: string;
    reference?: string;
    property_id?: string;
    type?: string;
    scheduled_at?: string;
    inspection_id?: string;
    summary?: string;
    photo_urls?: string[];
    effective_at?: string;
    grounds?: string;
    serve?: boolean;
    rent_review_date?: string;
  };

  if (body.action === "protect_deposit" && body.tenancy_id && body.scheme && body.reference) {
    const row = await protectDeposit({
      tenancyId: body.tenancy_id,
      scheme: body.scheme,
      reference: body.reference,
    });
    return NextResponse.json(row);
  }

  if (body.action === "create_inspection" && body.property_id && body.type) {
    const row = await createInspection({
      branchId: branch.id,
      propertyId: body.property_id,
      tenancyId: body.tenancy_id,
      type: body.type,
      scheduledAt: body.scheduled_at ? new Date(body.scheduled_at) : null,
    });
    return NextResponse.json(row, { status: 201 });
  }

  if (body.action === "complete_inspection" && body.inspection_id) {
    const row = await completeInspection(body.inspection_id, {
      summary: body.summary,
      photoUrls: body.photo_urls,
    });
    return NextResponse.json(row);
  }

  if (body.action === "create_notice" && body.tenancy_id && body.type) {
    const row = await createNotice({
      branchId: branch.id,
      tenancyId: body.tenancy_id,
      type: body.type,
      effectiveAt: body.effective_at,
      grounds: body.grounds,
      serve: body.serve ?? true,
    });
    return NextResponse.json(row, { status: 201 });
  }

  if (body.action === "bulk_rra") {
    const result = await bulkServeRraInfoSheet(branch.id);
    return NextResponse.json(result);
  }

  if (body.action === "set_rent_review" && body.tenancy_id && body.rent_review_date) {
    const row = await setRentReviewDate(body.tenancy_id, body.rent_review_date);
    return NextResponse.json(row);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
