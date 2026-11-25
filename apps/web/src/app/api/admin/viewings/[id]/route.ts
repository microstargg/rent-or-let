import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { parseJsonBody } from "@/lib/api-validation";
import { getViewing, updateViewing } from "@/lib/db/queries/viewings";
import { actorOf, logActivity } from "@/lib/db/queries/activity";
import { sendLandlordViewingFeedback, sendViewingConfirmation } from "@/lib/lettings/viewing-messages";
import { VIEWING_OUTCOMES, outcomeLabel, viewingWhen } from "@/lib/lettings/viewings";

const outcomes = VIEWING_OUTCOMES.map((o) => o.value) as [string, ...string[]];

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("outcome"),
    outcome: z.enum(outcomes).nullable(),
    feedback: z.string().max(4000).optional().nullable(),
  }),
  z.object({ action: z.literal("reschedule"), scheduled_at: z.string().datetime({ offset: true }) }),
  z.object({ action: z.literal("send_confirmation") }),
  z.object({ action: z.literal("send_feedback") }),
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const parsed = await parseJsonBody(request, schema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const current = await getViewing(id);
  if (!current) return NextResponse.json({ error: "Viewing not found" }, { status: 404 });
  const actor = actorOf(session);
  const log = (action: string, summary: string) =>
    logActivity(actor, {
      entityType: "viewing",
      entityId: id,
      propertyId: current.propertyId,
      branchId: current.viewing.branchId,
      action,
      summary,
    });

  switch (body.action) {
    case "outcome": {
      const row = await updateViewing(id, {
        outcome: body.outcome,
        ...(body.feedback !== undefined && { feedback: body.feedback?.trim() || null }),
      });
      await log("viewing_outcome", `Viewing on ${viewingWhen(current.viewing.scheduledAt)}: ${outcomeLabel(body.outcome)}`);
      return NextResponse.json(row);
    }
    case "reschedule": {
      const at = new Date(body.scheduled_at);
      const row = await updateViewing(id, { scheduledAt: at, reminderSentAt: null, confirmedAt: null });
      await log("viewing_rescheduled", `Viewing moved to ${viewingWhen(at)}`);
      return NextResponse.json(row);
    }
    case "send_confirmation": {
      const result = await sendViewingConfirmation(id);
      if (!result || (!result.email && !result.sms)) {
        return NextResponse.json({ error: result?.errors.join(" ") || "Nothing sent" }, { status: 400 });
      }
      await log("viewing_confirmed", `Confirmation sent by ${[result.email && "email", result.sms && "text"].filter(Boolean).join(" and ")}`);
      return NextResponse.json(result);
    }
    case "send_feedback": {
      const result = await sendLandlordViewingFeedback(id);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
      await log("viewing_feedback_sent", `Viewing feedback emailed to the landlord`);
      return NextResponse.json(result);
    }
  }
}
