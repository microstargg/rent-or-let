import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api-auth";
import { getDefaultBranch, refreshComplianceStatuses } from "@/lib/db/queries";

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });
  const result = await refreshComplianceStatuses(branch.id);
  return NextResponse.json({ ok: true, ...result });
}
