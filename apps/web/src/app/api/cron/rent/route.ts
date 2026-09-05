import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api-auth";
import { getDefaultBranch } from "@/lib/db/queries";
import { generateRentInvoicesForBranch } from "@/lib/operations/rent/generate-invoices";
import {
  getAgencyBySlug,
  listAgencySlugs,
  runWithAgencyAsync,
} from "@repo/config/server";

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencies = [];
  for (const slug of listAgencySlugs()) {
    const agency = getAgencyBySlug(slug);
    if (!agency.runtime.databaseUrl) continue;
    const result = await runWithAgencyAsync(agency, async () => {
      const branch = await getDefaultBranch();
      if (!branch) return { error: "No branch configured" as const };

      const periodStart = new Date();
      periodStart.setDate(1);
      const periodStartStr = periodStart.toISOString().slice(0, 10);
      const generated = await generateRentInvoicesForBranch(branch.id, periodStartStr);
      return generated;
    });
    agencies.push({ slug, ...result });
  }

  return NextResponse.json({ ok: true, agencies });
}
