import { NextResponse } from "next/server";
import { z } from "zod";
import { insertEnquiry } from "@/lib/db/queries";

const enquirySchema = z.object({
  property_id: z.string().optional(),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  message: z.string().min(1).max(5000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = enquirySchema.parse(body);

    const isUuid =
      data.property_id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.property_id);

    if (process.env.DATABASE_URL) {
      await insertEnquiry({
        propertyId: isUuid ? data.property_id! : null,
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        message: data.message,
        source: "website",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Enquiry error:", error);
    return NextResponse.json({ error: "Failed to submit enquiry" }, { status: 400 });
  }
}
