import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSession } from "@/lib/auth/server";
import { updateProperty } from "@/lib/db/queries";
import { enqueuePortalSync } from "@/lib/portals/sync-queue";

const propertySchema = z.object({
  branch_id: z.string().uuid(),
  agent_ref: z.string().min(1),
  slug: z.string().min(1),
  display_address: z.string().min(1),
  house_name_number: z.string(),
  street: z.string().min(1),
  town: z.string().min(1),
  postcode: z.string().min(1),
  price_pcm: z.number().positive(),
  deposit: z.number().min(0),
  holding_deposit: z.number().nullable().optional(),
  available_from: z.string(),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(1),
  property_type: z.string(),
  furnished: z.string(),
  status: z.enum(["draft", "available", "let_agreed", "archived"]),
  description: z.string().min(1),
  summary: z.string().nullable().optional(),
  features: z.array(z.string()).optional(),
  epc_rating: z.string().nullable().optional(),
  virtual_tour_url: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = propertySchema.parse(body);

    await updateProperty(id, {
      branchId: data.branch_id,
      agentRef: data.agent_ref,
      slug: data.slug,
      displayAddress: data.display_address,
      houseNameNumber: data.house_name_number,
      street: data.street,
      town: data.town,
      postcode: data.postcode,
      pricePcm: data.price_pcm,
      deposit: data.deposit,
      holdingDeposit: data.holding_deposit ?? null,
      availableFrom: data.available_from,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      propertyType: data.property_type,
      furnished: data.furnished,
      status: data.status,
      description: data.description,
      summary: data.summary,
      features: data.features,
      epcRating: data.epc_rating,
      virtualTourUrl: data.virtual_tour_url,
      publishedAt: data.status === "available" ? new Date() : null,
    });

    if (data.status === "available") {
      await enqueuePortalSync(id, "send");
    } else if (data.status === "archived" || data.status === "let_agreed") {
      await enqueuePortalSync(id, "remove");
    }

    return NextResponse.json({ id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update property" }, { status: 400 });
  }
}
