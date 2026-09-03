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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
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
      const blob = await put(pathname, file, { access: "public" });
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

  if (typeof body.status === "string") {
    await updateTicketStatus(id, body.status);
    return NextResponse.json({ success: true });
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
      status?: string;
      scheduled_for?: string | null;
      cost_estimate?: number | null;
      final_cost?: number | null;
    };

    if (wo.action === "create") {
      const row = await createWorkOrder({
        branchId: branch.id,
        ticketId: id,
        contractorId: wo.contractor_id,
        scheduledFor: wo.scheduled_for ? new Date(wo.scheduled_for) : null,
        costEstimate: wo.cost_estimate,
      });
      return NextResponse.json(row);
    }

    if (wo.action === "approve" && wo.id) {
      const result = await approveWorkOrder(wo.id);
      return NextResponse.json(result);
    }

    if (wo.action === "complete" && wo.id && wo.final_cost != null) {
      const result = await completeWorkOrder(wo.id, wo.final_cost);
      return NextResponse.json(result);
    }

    if (wo.action === "update" && wo.id) {
      const result = await updateWorkOrder(wo.id, {
        contractorId: wo.contractor_id,
        status: wo.status,
        scheduledFor: wo.scheduled_for ? new Date(wo.scheduled_for) : null,
        costEstimate: wo.cost_estimate,
        finalCost: wo.final_cost,
      });
      return NextResponse.json(result);
    }
  }

  const ticket = await getTicketById(id);
  return NextResponse.json(ticket);
}
