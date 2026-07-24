import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { syncBankFeedForBranch } from "@/lib/bank-feed/sync";

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const all = await db.select({ id: branches.id }).from(branches);
  const results = [];
  for (const branch of all) {
    try {
      const result = await syncBankFeedForBranch(branch.id);
      results.push({ branchId: branch.id, ...result });
    } catch (err) {
      results.push({
        branchId: branch.id,
        error: err instanceof Error ? err.message : "sync failed",
      });
    }
  }

  return NextResponse.json({ ok: true, results });
}
