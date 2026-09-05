import { NextResponse } from "next/server";
import { z } from "zod";
import { bindAgencyFromRequest } from "@/lib/agency";
import { publicCorsPreflight, withPublicCors } from "@/lib/public-cors";
import { insertEnquiry } from "@/lib/db/queries";

const enquirySchema = z.object({
  property_id: z.string().optional(),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  message: z.string().min(1).max(5000),
});

export async function OPTIONS(request: Request) {
  const agency = bindAgencyFromRequest(request);
  return publicCorsPreflight(agency, request);
}

export async function POST(request: Request) {
  const agency = bindAgencyFromRequest(request);
  try {
    const body = await request.json();
    const data = enquirySchema.parse(body);

    const isUuid =
      data.property_id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        data.property_id
      );

    if (agency.runtime.databaseUrl || process.env.DATABASE_URL) {
      await insertEnquiry({
        propertyId: isUuid ? data.property_id! : null,
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        message: data.message,
        source: "website",
      });
    }

    return withPublicCors(NextResponse.json({ success: true }), agency, request);
  } catch (error) {
    console.error("Enquiry error:", error);
    return withPublicCors(
      NextResponse.json({ error: "Failed to submit enquiry" }, { status: 400 }),
      agency,
      request
    );
  }
}
