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
import { updateHoldingDeposit } from "@/lib/db/queries/lettings";
import { actorOf, logActivity } from "@/lib/db/queries/activity";
import { sendViewingConfirmation } from "@/lib/lettings/viewing-messages";
import { viewingWhen } from "@/lib/lettings/viewings";
import { holdingDepositIssues, type HoldingDepositOutcome } from "@/lib/tenancy/deposits";

export async function POST(request: Request) {
  const { session, error } = await requireAdminApi();
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
    attendee_name?: string | null;
    attendee_email?: string | null;
    attendee_phone?: string | null;
    send_confirmation?: boolean;
    application_id?: string;
    rent_amount?: number;
    start_date?: string;
    deposit_amount?: number;
    referencing_status?: string;
    referencing_provider?: string | null;
    referencing_ref?: string | null;
    referencing_note?: string | null;
    holding_amount?: number | null;
    holding_paid_at?: string | null;
    holding_outcome?: HoldingDepositOutcome | null;
    holding_note?: string | null;
    landlord_id?: string;
  };

  if (body.action === "set_pipeline" && body.enquiry_id && body.pipeline_stage) {
    const row = await updateEnquiryPipeline(body.enquiry_id, body.pipeline_stage);
    return NextResponse.json(row);
  }

  if (body.action === "book_viewing" && body.property_id && body.scheduled_at) {
    const scheduledAt = new Date(body.scheduled_at);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Pick a date and time" }, { status: 400 });
    }
    const clean = (v: string | null | undefined) => (v?.trim() ? v.trim().slice(0, 200) : null);
    const row = await createViewing({
      branchId: branch.id,
      propertyId: body.property_id,
      enquiryId: body.enquiry_id,
      scheduledAt,
      notes: body.notes,
      attendeeName: clean(body.attendee_name),
      attendeeEmail: clean(body.attendee_email),
      attendeePhone: clean(body.attendee_phone),
    });
    await logActivity(actorOf(session), {
      entityType: "viewing",
      entityId: row.id,
      propertyId: body.property_id,
      branchId: branch.id,
      action: "viewing_booked",
      summary: `Viewing booked for ${viewingWhen(scheduledAt)}`,
    });
    const confirmation = body.send_confirmation ? await sendViewingConfirmation(row.id) : null;
    return NextResponse.json({ ...row, confirmation }, { status: 201 });
  }

  if (body.action === "set_referencing" && body.application_id && body.referencing_status) {
    const hasDetails =
      body.referencing_provider !== undefined ||
      body.referencing_ref !== undefined ||
      body.referencing_note !== undefined;
    const row = await updateApplicationReferencing(
      body.application_id,
      body.referencing_status,
      hasDetails
        ? { provider: body.referencing_provider, reference: body.referencing_ref, note: body.referencing_note }
        : undefined
    );
    return NextResponse.json(row);
  }

  if (body.action === "holding_deposit" && body.application_id) {
    const { getApplicationById } = await import("@/lib/db/queries");
    const app = await getApplicationById(body.application_id);
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    let monthlyRent: number | null = null;
    if (app.propertyId) {
      const { getPropertyById } = await import("@/lib/db/queries");
      const property = await getPropertyById(app.propertyId);
      monthlyRent = property ? Number(property.price_pcm) : null;
    }
    const amount = body.holding_amount ?? (app.holdingDepositAmount ? Number(app.holdingDepositAmount) : 0);
    const issues = holdingDepositIssues({
      amount,
      monthlyRent,
      outcome: body.holding_outcome ?? null,
      note: body.holding_note ?? app.holdingDepositNote,
    });
    if (issues.length) return NextResponse.json({ error: issues.join(" ") }, { status: 422 });
    const row = await updateHoldingDeposit(body.application_id, {
      amount: body.holding_amount,
      paidAt: body.holding_paid_at,
      outcome: body.holding_outcome,
      note: body.holding_note,
    });
    return NextResponse.json(row);
  }

  if (body.action === "convert_application" && body.application_id && body.start_date) {
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
