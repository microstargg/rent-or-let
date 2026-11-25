import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { parseJsonBody } from "@/lib/api-validation";
import { actorOf, logActivity } from "@/lib/db/queries/activity";
import { recordRenterRightToRent, RTR_METHODS } from "@/lib/db/queries/renter-documents";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema = z.object({
  checked_at: isoDate,
  method: z.enum(["manual", "share_code", "idsp"]),
  expires_at: isoDate.optional().nullable(),
  share_code: z.string().trim().max(20).optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const parsed = await parseJsonBody(request, schema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  if (body.expires_at && body.expires_at <= body.checked_at) {
    return NextResponse.json({ error: "The follow-up date must be after the check date" }, { status: 400 });
  }
  if (body.method === "share_code" && !body.share_code) {
    return NextResponse.json({ error: "Enter the share code you checked" }, { status: 400 });
  }
  const row = await recordRenterRightToRent(id, {
    checkedAt: body.checked_at,
    method: body.method,
    expiresAt: body.expires_at,
    shareCode: body.share_code,
  });
  if (!row) return NextResponse.json({ error: "Renter not found" }, { status: 404 });
  await logActivity(actorOf(session), {
    entityType: "renter",
    entityId: id,
    branchId: row.branchId,
    action: "right_to_rent",
    summary: `Right to Rent check recorded (${RTR_METHODS[body.method]})${body.expires_at ? `, follow-up due ${body.expires_at}` : ", no time limit"}`,
  });
  return NextResponse.json(row);
}
