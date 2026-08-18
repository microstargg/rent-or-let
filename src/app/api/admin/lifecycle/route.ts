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
    proposed_rent?: number;
    served_to?: string;
    acknowledge_warnings?: boolean;
    meta?: Record<string, unknown>;
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
    if (body.type === "section_13") {
      const { getTenancyNoticeContext } = await import("@/lib/db/queries");
      const { validateRentIncrease } = await import("@/lib/rra/rent-increase");
      const ctx = await getTenancyNoticeContext(body.tenancy_id);
      if (!ctx) return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
      const proposed = Number(body.proposed_rent);
      const last =
        ctx.tenancy.rentReviewDate ??
        ctx.lastSection13?.effectiveAt ??
        ctx.lastSection13?.servedAt?.toISOString().slice(0, 10) ??
        null;
      const validation = validateRentIncrease({
        currentRent: Number(ctx.tenancy.rentAmount),
        proposedRent: proposed,
        tenancyStart: ctx.tenancy.startDate,
        lastIncreaseDate: last,
        serveDate: new Date().toISOString().slice(0, 10),
        effectiveDate: body.effective_at ?? "",
        epcRating: ctx.property.epcRating,
      });
      if (!validation.ok) {
        return NextResponse.json({ error: "Rent increase failed validation", issues: validation.issues }, { status: 422 });
      }
      if (validation.issues.length && !body.acknowledge_warnings) {
        return NextResponse.json({ issues: validation.issues, needsAck: true }, { status: 409 });
      }
      const row = await createNotice({
        branchId: branch.id,
        tenancyId: body.tenancy_id,
        type: body.type,
        effectiveAt: body.effective_at,
        grounds: body.grounds,
        serve: body.serve ?? true,
        servedTo: body.served_to,
        meta: { proposedRent: proposed },
      });
      if (body.effective_at) await setRentReviewDate(body.tenancy_id, body.effective_at);
      return NextResponse.json({ notice: row, issues: validation.issues }, { status: 201 });
    }
    const row = await createNotice({
      branchId: branch.id,
      tenancyId: body.tenancy_id,
      type: body.type,
      effectiveAt: body.effective_at,
      grounds: body.grounds,
      serve: body.serve ?? true,
      servedTo: body.served_to,
      meta: body.meta,
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
