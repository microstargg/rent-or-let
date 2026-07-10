import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { markInvoicePaid, markInvoicePartialPaid } from "@/lib/db/queries";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { id } = await params;
  const body = (await request.json()) as {
    action?: string;
    amount?: number;
    method?: string;
  };

  if (body.action === "mark_paid") {
    const row = await markInvoicePaid(id, body.method ?? "bank_transfer");
    return NextResponse.json(row);
  }

  if (body.action === "partial_pay") {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    const result = await markInvoicePartialPaid(id, amount, body.method ?? "bank_transfer");
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
