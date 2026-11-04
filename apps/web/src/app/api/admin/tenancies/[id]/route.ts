import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenant } from "@repo/config/server";
import { requireAdminApi } from "@/lib/api-auth";
import { createNotice, endTenancy } from "@/lib/db/queries";
import {
  addGuarantor,
  addJointTenant,
  createTenancyAgreement,
  getTenancyDetail,
  recordRightToRent,
  removeTenancyParty,
  saveDepositReturn,
} from "@/lib/db/queries/tenancy";
import { parseJsonBody } from "@/lib/api-validation";
import { checkSection8, getGround } from "@/lib/tenancy/section8";
import { getAppUrl } from "@/lib/app-url";
import { sendEmail } from "@/lib/email/send";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("end") }),
  z.object({ action: z.literal("add_joint_tenant"), renter_id: z.string().uuid() }),
  z.object({
    action: z.literal("add_guarantor"),
    full_name: z.string().trim().min(2).max(120),
    email: z.string().email().optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    address: z.string().max(300).optional().nullable(),
    guarantees_renter_id: z.string().uuid().optional().nullable(),
  }),
  z.object({ action: z.literal("remove_party"), party_id: z.string().uuid() }),
  z.object({
    action: z.literal("right_to_rent"),
    renter_id: z.string().uuid(),
    checked_at: isoDate,
    method: z.enum(["manual", "share_code", "idsp"]),
    expires_at: isoDate.optional().nullable(),
  }),
  z.object({
    action: z.literal("deposit_return"),
    deductions: z
      .array(z.object({ reason: z.string().max(200), amount: z.number().min(0) }))
      .max(30)
      .optional(),
    status: z.enum(["proposed", "agreed", "disputed", "paid"]).optional(),
    notes: z.string().max(2000).optional().nullable(),
    dispute: z
      .object({
        scheme_case_ref: z.string().max(80).optional(),
        outcome: z.string().max(500).optional(),
        resolved: z.boolean().optional(),
      })
      .optional()
      .nullable(),
  }),
  z.object({
    action: z.literal("section_8"),
    grounds: z.array(z.string()).min(1).max(10),
    details: z.string().max(4000).optional().nullable(),
    acknowledge_warnings: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("send_agreement"),
    additional_terms: z.string().max(8000).optional().nullable(),
    email_links: z.boolean().optional(),
  }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminApi();
  if (error) return error;

  const { id } = await params;
  const parsed = await parseJsonBody(request, actionSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  switch (body.action) {
    case "end":
      return NextResponse.json(await endTenancy(id));

    case "add_joint_tenant": {
      const result = await addJointTenant(id, body.renter_id);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result.row, { status: 201 });
    }

    case "add_guarantor": {
      const row = await addGuarantor(id, {
        fullName: body.full_name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        guaranteesRenterId: body.guarantees_renter_id,
      });
      if (!row) return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
      return NextResponse.json(row, { status: 201 });
    }

    case "remove_party": {
      const row = await removeTenancyParty(id, body.party_id);
      if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    case "right_to_rent": {
      if (body.expires_at && body.expires_at <= body.checked_at) {
        return NextResponse.json({ error: "Expiry must be after the check date" }, { status: 400 });
      }
      const row = await recordRightToRent(id, body.renter_id, {
        checkedAt: body.checked_at,
        method: body.method,
        expiresAt: body.expires_at,
      });
      if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(row);
    }

    case "deposit_return": {
      const result = await saveDepositReturn(id, {
        deductions: body.deductions,
        status: body.status,
        notes: body.notes,
        dispute: body.dispute
          ? {
              schemeCaseRef: body.dispute.scheme_case_ref,
              outcome: body.dispute.outcome,
              resolved: body.dispute.resolved,
            }
          : undefined,
      });
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result.depositReturn);
    }

    case "section_8": {
      const detail = await getTenancyDetail(id);
      if (!detail) return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
      const today = new Date().toISOString().slice(0, 10);
      const check = checkSection8({
        grounds: body.grounds,
        serveDate: today,
        tenancyStart: detail.tenancy.startDate,
        arrears: detail.overdue,
        monthlyRent: Number(detail.tenancy.rentAmount),
        depositAmount: detail.tenancy.depositAmount ? Number(detail.tenancy.depositAmount) : null,
        depositProtected: Boolean(detail.tenancy.depositProtectionRef),
      });
      if (check.errors.length) {
        return NextResponse.json({ error: check.errors.join(" "), check }, { status: 422 });
      }
      if (check.warnings.length && !body.acknowledge_warnings) {
        return NextResponse.json({ needsAck: true, check }, { status: 409 });
      }
      const groundLines = body.grounds
        .map((code) => getGround(code))
        .filter(Boolean)
        .map((g) => `Ground ${g!.code}: ${g!.title}`);
      const notice = await createNotice({
        branchId: detail.tenancy.branchId,
        tenancyId: id,
        type: "section_8",
        effectiveAt: check.earliestDate,
        grounds: [...groundLines, body.details?.trim()].filter(Boolean).join("\n\n"),
        serve: true,
        servedTo: detail.renter.email ?? undefined,
        meta: { grounds: body.grounds, arrearsAtService: detail.overdue, warnings: check.warnings },
      });
      return NextResponse.json({ notice, check }, { status: 201 });
    }

    case "send_agreement": {
      const result = await createTenancyAgreement(id, {
        additionalTerms: body.additional_terms,
        agentName: session?.user?.name || getTenant().name,
        agentEmail: session?.user?.email ?? null,
      });
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: 404 });
      const base = getAppUrl();
      const links = result.links.map((l) => ({ ...l, url: `${base}/sign/${l.token}` }));
      const emailed: string[] = [];
      if (body.email_links) {
        for (const l of links) {
          if (!l.email || l.role === "agent") continue;
          const sent = await sendEmail({
            to: l.email,
            subject: `Please sign your tenancy agreement`,
            text: `Hi ${l.fullName},\n\nYour tenancy agreement from ${getTenant().name} is ready to read and sign online:\n\n${l.url}\n\nThe link is personal to you, so please don't forward it.\n\n${getTenant().name}`,
          });
          if (sent.ok) emailed.push(l.email);
        }
      }
      return NextResponse.json(
        {
          agreementId: result.agreementId,
          links: links.map(({ token: _t, ...rest }) => rest),
          emailed,
        },
        { status: 201 }
      );
    }
  }
}
