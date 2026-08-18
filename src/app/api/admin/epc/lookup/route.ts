import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { isEpcConfigured, searchEpcCertificates } from "@/lib/epc/lookup";
import {
  getDefaultBranch,
  getPropertyById,
  updateProperty,
  upsertEpcForProperty,
} from "@/lib/db/queries";

const Body = z.object({
  property_id: z.string().uuid().optional(),
  postcode: z.string().min(3),
  house_name_number: z.string().optional(),
  street: z.string().optional(),
  apply: z.boolean().optional(),
  lmk_key: z.string().optional(),
});

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  if (!isEpcConfigured()) {
    return NextResponse.json(
      {
        error:
          "EPC lookup is not configured. Add EPC_API_EMAIL and EPC_API_KEY from Open Data Communities.",
      },
      { status: 503 }
    );
  }

  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Postcode is required" }, { status: 400 });
  }

  try {
    const result = await searchEpcCertificates({
      postcode: parsed.data.postcode,
      houseNameNumber: parsed.data.house_name_number,
      street: parsed.data.street,
    });

    if (parsed.data.apply && parsed.data.property_id) {
      const chosen =
        result.matches.find((m) => m.lmkKey === parsed.data.lmk_key) ?? result.best;
      if (!chosen) {
        return NextResponse.json({ error: "No matching EPC to apply", ...result }, { status: 404 });
      }
      const property = await getPropertyById(parsed.data.property_id);
      const branch = await getDefaultBranch();
      if (!property || !branch) {
        return NextResponse.json({ error: "Property not found" }, { status: 404 });
      }
      await updateProperty(property.id, {
        epcRating: chosen.currentRating,
        epcUrl: chosen.certificateUrl || null,
      });
      await upsertEpcForProperty({
        branchId: branch.id,
        propertyId: property.id,
        rating: chosen.currentRating,
        issuedAt: chosen.lodgementDate,
        expiresAt: chosen.expiryDate,
        certificateUrl: chosen.certificateUrl,
        reference: chosen.lmkKey,
      });
      return NextResponse.json({ applied: chosen, ...result });
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "EPC lookup failed" },
      { status: 502 }
    );
  }
}
