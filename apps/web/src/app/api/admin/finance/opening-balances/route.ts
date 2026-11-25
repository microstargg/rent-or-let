import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { getDefaultBranch, getTenancyById } from "@/lib/db/queries";
import { setOpeningBalance } from "@/lib/db/queries/tenant-credit";
import { actorOf, logActivity } from "@/lib/db/queries/activity";
import { parseJsonBody } from "@/lib/api-validation";
import { formatCurrency } from "@/lib/utils";

const bodySchema = z.object({
  as_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rows: z
    .array(
      z.object({
        tenancy_id: z.string().uuid(),
        kind: z.enum(["arrears", "credit"]),
        amount: z.number().positive().max(1000000),
      })
    )
    .min(1)
    .max(500),
});

/** Opening balances for many tenancies at once, when a client moves over from another agent. */
export async function POST(request: Request) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });

  const parsed = await parseJsonBody(request, bodySchema);
  if (parsed.error) return parsed.error;
  const { as_of, rows } = parsed.data;
  const actor = actorOf(session);

  let saved = 0;
  const errors: string[] = [];
  for (const row of rows) {
    const tenancy = await getTenancyById(row.tenancy_id);
    if (!tenancy || tenancy.tenancy.branchId !== branch.id) {
      errors.push("A tenancy wasn't found.");
      continue;
    }
    const result = await setOpeningBalance(row.tenancy_id, { kind: row.kind, amount: row.amount, asOf: as_of });
    if ("error" in result) {
      errors.push(`${tenancy.property.displayAddress}: ${result.error}`);
      continue;
    }
    saved += 1;
    await logActivity(actor, {
      entityType: "tenancy",
      entityId: row.tenancy_id,
      tenancyId: row.tenancy_id,
      propertyId: tenancy.tenancy.propertyId,
      action: "opening_balance_set",
      summary: `Opening ${row.kind === "arrears" ? "arrears" : "credit"} of ${formatCurrency(row.amount)} as of ${as_of}`,
    });
  }
  return NextResponse.json({ saved, errors });
}
