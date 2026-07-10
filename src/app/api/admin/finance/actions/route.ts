import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { getDefaultBranch, applyLateFeesForBranch, resolvePaymentException } from "@/lib/db/queries";

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });

  const body = (await request.json()) as { action?: string; exceptionId?: string };

  if (body.action === "apply_late_fees") {
    const result = await applyLateFeesForBranch(branch.id);
    return NextResponse.json(result);
  }

  if (body.action === "resolve_exception" && body.exceptionId) {
    const row = await resolvePaymentException(body.exceptionId);
    return NextResponse.json(row);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
