import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import {
  getDefaultBranch,
  updateEnquiryPipeline,
  createViewing,
  convertApplicationToTenancy,
  updateApplicationReferencing,
  issueLandlordPortalInvite,
  getLandlordById,
} from "@/lib/db/queries";

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });

  const body = (await request.json()) as {
    action?: string;
    enquiry_id?: string;
    pipeline_stage?: string;
    property_id?: string;
    scheduled_at?: string;
    notes?: string;
    application_id?: string;
    rent_amount?: number;
    start_date?: string;
    deposit_amount?: number;
    referencing_status?: string;
    landlord_id?: string;
  };

  if (body.action === "set_pipeline" && body.enquiry_id && body.pipeline_stage) {
    const row = await updateEnquiryPipeline(body.enquiry_id, body.pipeline_stage);
    return NextResponse.json(row);
  }

  if (body.action === "book_viewing" && body.property_id && body.scheduled_at) {
    const row = await createViewing({
      branchId: branch.id,
      propertyId: body.property_id,
      enquiryId: body.enquiry_id,
      scheduledAt: new Date(body.scheduled_at),
      notes: body.notes,
    });
    return NextResponse.json(row, { status: 201 });
  }

  if (body.action === "set_referencing" && body.application_id && body.referencing_status) {
    const row = await updateApplicationReferencing(body.application_id, body.referencing_status);
    return NextResponse.json(row);
  }

  if (body.action === "convert_application" && body.application_id && body.rent_amount && body.start_date) {
    const result = await convertApplicationToTenancy(body.application_id, {
      branchId: branch.id,
      rentAmount: body.rent_amount,
      startDate: body.start_date,
      depositAmount: body.deposit_amount,
    });
    return NextResponse.json(result, { status: 201 });
  }

  if (body.action === "landlord_invite" && body.landlord_id) {
    const landlord = await getLandlordById(body.landlord_id);
    if (!landlord?.email) {
      return NextResponse.json({ error: "Landlord needs an email" }, { status: 400 });
    }
    const issued = await issueLandlordPortalInvite({
      branchId: branch.id,
      landlordId: landlord.id,
      email: landlord.email,
    });
    return NextResponse.json(issued);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
