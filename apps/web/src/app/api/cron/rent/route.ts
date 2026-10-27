import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api-auth";
import { getDefaultBranch } from "@/lib/db/queries";
import { raiseRentInvoices } from "@/lib/operations/rent/generate-invoices";
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

      const generated = await raiseRentInvoices(branch.id);
      return generated;
    });
    agencies.push({ slug, ...result });
  }

  return NextResponse.json({ ok: true, agencies });
}
