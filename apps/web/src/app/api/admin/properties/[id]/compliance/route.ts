import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { updatePropertyComplianceSettings } from "@/lib/db/queries/compliance";
import { parseJsonBody } from "@/lib/api-validation";

const schema = z.object({
  gas_supply: z.boolean().optional(),
  licensing: z.enum(["hmo", "selective", "additional"]).nullable().optional(),
});

/** Property compliance settings: whether it has gas, and which licensing scheme applies. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const parsed = await parseJsonBody(request, schema);
  if (parsed.error) return parsed.error;
  const row = await updatePropertyComplianceSettings(id, {
    gasSupply: parsed.data.gas_supply,
    licensing: parsed.data.licensing,
  });
  if (!row) return NextResponse.json({ error: "Property not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
