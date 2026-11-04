import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdminApi } from "@/lib/api-auth";
import {
  updateTicketStatus,
  addTicketMessage,
  createWorkOrder,
  updateWorkOrder,
  getTicketById,
  getDefaultBranch,
  attachDocumentToTicket,
  approveWorkOrder,
  completeWorkOrder,
} from "@/lib/db/queries";
import { assignWorkOrder } from "@/lib/db/queries/notifications";
import { setTicketHazard } from "@/lib/db/queries/tickets";
import { actorOf, logActivity } from "@/lib/db/queries/activity";
import { HAZARD_STEPS, hazardForTicket, type HazardState } from "@/lib/tickets/hazard";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminApi();
  if (error) return error;

  const { id } = await params;
  const branch = await getDefaultBranch();
  if (!branch) {
    return NextResponse.json({ error: "No branch configured" }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
    const ext = file.name.split(".").pop() ?? "jpg";
    const pathname = `tickets/${id}/${Date.now()}.${ext}`;
    let url: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(pathname, file, { access: "public", addRandomSuffix: true });
      url = blob.url;
    } else {
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const dir = join(process.cwd(), "public", "uploads", "tickets", id);
      await mkdir(dir, { recursive: true });
      const filename = `${Date.now()}.${ext}`;
      await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));
      url = `/uploads/tickets/${id}/${filename}`;
    }
    const doc = await attachDocumentToTicket({
      branchId: branch.id,
      ticketId: id,
      url,
      filename: file.name,
    });
    return NextResponse.json(doc);
  }

  const body = await request.json();

  const ticketLog = async (action: string, summary: string) => {
    const t = await getTicketById(id);
    if (!t) return;
    await logActivity(actorOf(session), {
      entityType: "ticket",
      entityId: id,
      propertyId: t.ticket.propertyId,
      tenancyId: t.ticket.tenancyId,
      branchId: branch.id,
      action,
      summary: `${t.ticket.summary}: ${summary}`,
    });
  };

  if (typeof body.status === "string") {
    await updateTicketStatus(id, body.status);
    await ticketLog("ticket_status", `status set to ${body.status}`);
    return NextResponse.json({ success: true });
  }

  if (body.hazard && typeof body.hazard === "object") {
    const h = body.hazard as {
      action?: "start" | "level" | "step" | "undo" | "stop";
      level?: "significant" | "emergency";
      step?: string;
      at?: string;
      aware_at?: string;
    };
    const t = await getTicketById(id);
    if (!t) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    const current = hazardForTicket(t.ticket);
    const at = (v?: string) => {
      const d = v ? new Date(v) : new Date();
      return Number.isNaN(d.getTime()) || d.getTime() > Date.now() + 60_000 ? null : d.toISOString();
    };
    const stepLabel = HAZARD_STEPS.find((s) => s.key === h.step)?.label;

    if (h.action === "stop") {
      await setTicketHazard(id, null);
      await ticketLog("hazard_stopped", "hazard clock stopped");
      return NextResponse.json({ ok: true });
    }
    if (h.action === "start" || h.action === "level") {
      const level = h.level === "emergency" ? "emergency" : "significant";
      const awareAt = (h.aware_at ? at(h.aware_at) : null) ?? current?.awareAt ?? t.ticket.createdAt.toISOString();
      const next: HazardState = { ...(current ?? { awareAt }), level, awareAt };
      await setTicketHazard(id, { ...next });
      await ticketLog("hazard_level", `treated as ${level === "emergency" ? "an emergency" : "a significant"} hazard`);
      return NextResponse.json(next);
    }
    if ((h.action === "step" || h.action === "undo") && current && stepLabel) {
      const when = h.action === "undo" ? null : at(h.at);
      if (h.action === "step" && !when) {
        return NextResponse.json({ error: "Pick a date that isn't in the future" }, { status: 400 });
      }
      const next = { ...current, [h.step as string]: when };
      await setTicketHazard(id, next);
      await ticketLog("hazard_step", h.action === "undo" ? `"${stepLabel}" marked not done` : `"${stepLabel}" done`);
      return NextResponse.json(next);
    }
    return NextResponse.json({ error: "Unknown hazard action" }, { status: 400 });
  }

  if (typeof body.message === "string" && body.message.trim()) {
    await addTicketMessage({
      branchId: branch.id,
      ticketId: id,
      senderType: "staff",
      body: body.message.trim(),
      channel: "portal",
    });
    return NextResponse.json({ success: true });
  }

  if (body.work_order) {
    const wo = body.work_order as {
      action?: string;
      id?: string;
      contractor_id?: string | null;
      assignee_staff_id?: string | null;
      status?: string;
      scheduled_for?: string | null;
      cost_estimate?: number | null;
      final_cost?: number | null;
      client_charge?: number | null;
    };

    if (wo.action === "create") {
      const row = await createWorkOrder({
        branchId: branch.id,
        ticketId: id,
        contractorId: wo.contractor_id,
        assigneeStaffId: wo.assignee_staff_id || null,
        scheduledFor: wo.scheduled_for ? new Date(wo.scheduled_for) : null,
        costEstimate: wo.cost_estimate,
        clientCharge: wo.client_charge,
      }, session?.user.id);
      return NextResponse.json(row);
    }

    if (wo.action === "assign" && wo.id) {
      const row = await assignWorkOrder(wo.id, wo.assignee_staff_id || null, session?.user.id);
      if (!row) return NextResponse.json({ error: "Job not found" }, { status: 404 });
      return NextResponse.json(row);
    }

    if (wo.action === "approve" && wo.id) {
      const result = await approveWorkOrder(wo.id);
      return NextResponse.json(result);
    }

    if (wo.action === "complete" && wo.id && wo.final_cost != null) {
      const result = await completeWorkOrder(wo.id, wo.final_cost, wo.client_charge);
      return NextResponse.json(result);
    }

    if (wo.action === "update" && wo.id) {
      const result = await updateWorkOrder(wo.id, {
        contractorId: wo.contractor_id,
        status: wo.status,
        scheduledFor: wo.scheduled_for ? new Date(wo.scheduled_for) : null,
        costEstimate: wo.cost_estimate,
        finalCost: wo.final_cost,
        clientCharge: wo.client_charge,
      });
      return NextResponse.json(result);
    }
  }

  const ticket = await getTicketById(id);
  return NextResponse.json(ticket);
}
