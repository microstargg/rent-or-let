import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { generateListingCopy } from "@/lib/ai/listing-copy";
import { isAiConfigured, aiUnavailableMessage } from "@/lib/ai/client";
import { toClientSafeAiError } from "@/lib/ai/models";

const Body = z.object({
  town: z.string().min(1),
  postcode: z.string().optional(),
  displayAddress: z.string().optional(),
  bedrooms: z.coerce.number(),
  bathrooms: z.coerce.number(),
  propertyType: z.string(),
  furnished: z.string(),
  pricePcm: z.coerce.number(),
  features: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  if (!isAiConfigured()) {
    return NextResponse.json({ error: aiUnavailableMessage() }, { status: 503 });
  }
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid listing details" }, { status: 400 });
  }
  try {
    const copy = await generateListingCopy(parsed.data);
    return NextResponse.json(copy);
  } catch (err) {
    console.error("listing-copy AI failed", err);
    return NextResponse.json(
      { error: toClientSafeAiError(err, aiUnavailableMessage()).message },
      { status: 502 }
    );
  }
}
