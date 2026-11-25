import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { updatePropertyComplianceSettings, updatePropertyRegister } from "@/lib/db/queries/compliance";
import { REGISTER_WINDOWS, normaliseRegisterNumber } from "@/lib/compliance/register";
import { parseJsonBody } from "@/lib/api-validation";

const schema = z.object({
  gas_supply: z.boolean().optional(),
  licensing: z.enum(["hmo", "selective", "additional"]).nullable().optional(),
  prs_property_number: z.string().max(20).nullable().optional(),
  prs_registered_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  prs_region: z
    .enum(Object.keys(REGISTER_WINDOWS) as [string, ...string[]])
    .nullable()
    .optional(),
});

/** Property compliance settings: whether it has gas, and which licensing scheme applies. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const parsed = await parseJsonBody(request, schema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  if (body.gas_supply !== undefined || body.licensing !== undefined) {
    const row = await updatePropertyComplianceSettings(id, {
      gasSupply: body.gas_supply,
      licensing: body.licensing,
    });
    if (!row) return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }
  if (body.prs_property_number !== undefined || body.prs_registered_at !== undefined || body.prs_region !== undefined) {
    const number = normaliseRegisterNumber(body.prs_property_number, "property");
    if (!number.ok) {
      return NextResponse.json(
        { error: "Property register numbers look like P-XXXX-XXXX" },
        { status: 400 }
      );
    }
    const row = await updatePropertyRegister(id, {
      ...(body.prs_property_number !== undefined && { prsPropertyNumber: number.value }),
      ...(body.prs_registered_at !== undefined && { prsRegisteredAt: body.prs_registered_at }),
      ...(body.prs_region !== undefined && { prsRegion: body.prs_region }),
    });
    if (!row) return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
