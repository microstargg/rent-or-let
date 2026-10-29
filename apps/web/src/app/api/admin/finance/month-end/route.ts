import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { getDefaultBranch } from "@/lib/db/queries";
import {
  reopenOutgoingTransaction,
  resolveOutgoingTransaction,
} from "@/lib/bank-feed/match-outgoing";
import { saveClientAccountCheck } from "@/lib/db/queries/client-account";
import { monthPeriod } from "@/lib/db/queries/month-end";

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    transaction_id?: string;
    link_kind?: string;
    link_id?: string;
    note?: string;
    month?: string;
    bank_balance?: number;
  };

  if (body.action === "save_balance_check") {
    if (!body.month || !/^\d{4}-\d{2}$/.test(body.month)) {
      return NextResponse.json({ error: "month required" }, { status: 400 });
    }
    const balance = Number(body.bank_balance);
    if (!Number.isFinite(balance)) {
      return NextResponse.json({ error: "Enter the bank balance" }, { status: 400 });
    }
    const entry = await saveClientAccountCheck(branch.id, monthPeriod(body.month), balance);
    return NextResponse.json(entry);
  }

  if (!body.transaction_id) {
    return NextResponse.json({ error: "transaction_id required" }, { status: 400 });
  }

  if (body.action === "link_outgoing" && body.link_id) {
    if (body.link_kind !== "payout" && body.link_kind !== "contractor") {
      return NextResponse.json({ error: "link_kind must be payout or contractor" }, { status: 400 });
    }
    const row = await resolveOutgoingTransaction(branch.id, body.transaction_id, {
      kind: body.link_kind,
      id: body.link_id,
    });
    if (!row) return NextResponse.json({ error: "Could not link that payment" }, { status: 400 });
    return NextResponse.json(row);
  }

  if (body.action === "mark_expected") {
    const note = body.note?.trim();
    if (!note) return NextResponse.json({ error: "Say what the payment was" }, { status: 400 });
    const row = await resolveOutgoingTransaction(branch.id, body.transaction_id, {
      kind: "other",
      note,
    });
    if (!row) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    return NextResponse.json(row);
  }

  if (body.action === "reopen_outgoing") {
    const row = await reopenOutgoingTransaction(branch.id, body.transaction_id);
    if (!row) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    return NextResponse.json(row);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
