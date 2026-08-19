import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { getTicketById, listTicketMessages, updateTicketTriage } from "@/lib/db/queries";
import { draftTicketReply, suggestTicketTriage } from "@/lib/ai/ticket-assist";
import { isAiConfigured, aiUnavailableMessage } from "@/lib/ai/client";
import { toClientSafeAiError } from "@/lib/ai/models";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;
  if (!isAiConfigured()) {
    return NextResponse.json({ error: aiUnavailableMessage() }, { status: 503 });
  }

  const { id } = await params;
  const ticketRow = await getTicketById(id);
  if (!ticketRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json()) as { action?: string };
  const { ticket, propertyAddress } = ticketRow;

  try {
    if (body.action === "triage") {
      const suggestion = await suggestTicketTriage({
        summary: ticket.summary,
        description: ticket.description,
      });
      return NextResponse.json({ suggestion });
    }
    if (body.action === "apply_triage") {
      const suggestion = await suggestTicketTriage({
        summary: ticket.summary,
        description: ticket.description,
      });
      await updateTicketTriage(id, {
        priority: suggestion.priority,
        category: suggestion.category,
        isEmergency: suggestion.isEmergency,
      });
      return NextResponse.json({ suggestion, applied: true });
    }
    if (body.action === "draft_reply") {
      const messages = await listTicketMessages(id);
      const draft = await draftTicketReply({
        summary: ticket.summary,
        description: ticket.description,
        propertyAddress,
        messages: messages.map((m) => ({ senderType: m.senderType, body: m.body })),
      });
      return NextResponse.json({ draft });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("ticket AI failed", err);
    return NextResponse.json(
      { error: toClientSafeAiError(err, aiUnavailableMessage()).message },
      { status: 502 }
    );
  }
}
