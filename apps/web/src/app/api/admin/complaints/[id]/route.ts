import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { getComplaintById, updateComplaint } from "@/lib/db/queries";
import { actorOf, logActivity } from "@/lib/db/queries/activity";
import { parseJsonBody } from "@/lib/api-validation";

const STATUS_TEXT: Record<string, string> = {
  open: "Reopened",
  investigating: "Investigating",
  resolved: "Marked resolved",
  closed: "Closed",
};

/** Change a complaint's status and/or record a response on its timeline. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;

  const parsed = await parseJsonBody(
    request,
    z.object({
      status: z.enum(["open", "investigating", "resolved", "closed"]).optional(),
      resolved_at: z.string().nullable().optional(),
      response: z.string().trim().max(5000).optional(),
      response_kind: z.enum(["response", "note"]).optional(),
    })
  );
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const complaint = await getComplaintById(id);
  if (!complaint) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const actor = actorOf(session);

  if (body.status && body.status !== complaint.status) {
    const closing = body.status === "resolved" || body.status === "closed";
    await updateComplaint(id, {
      status: body.status,
      resolvedAt: closing ? (body.resolved_at ? new Date(body.resolved_at) : new Date()) : null,
    });
    await logActivity(actor, {
      entityType: "complaint",
      entityId: id,
      propertyId: complaint.propertyId,
      action: "complaint.status",
      summary: STATUS_TEXT[body.status] ?? body.status,
    });
  }

  if (body.response) {
    const kind = body.response_kind ?? "response";
    await logActivity(actor, {
      entityType: "complaint",
      entityId: id,
      propertyId: complaint.propertyId,
      action: kind === "note" ? "complaint.note" : "complaint.response",
      summary: body.response,
    });
  }

  return NextResponse.json({ success: true });
}
