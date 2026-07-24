import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { getDefaultBranch, getBankFeedSummary } from "@/lib/db/queries";
import { matchPendingBankTransactions } from "@/lib/bank-feed/sync";

/**
 * GET  — bank feed summary (CSV-imported transactions + match stats)
 * POST — rematch unmatched imported transactions
 */
export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });

  const summary = await getBankFeedSummary(branch.id);
  return NextResponse.json(summary);
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const action = (body as { action?: string }).action;

  if (action === "sync" || action === "rematch") {
    const result = await matchPendingBankTransactions(branch.id);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unknown action. Use rematch." }, { status: 400 });
}
