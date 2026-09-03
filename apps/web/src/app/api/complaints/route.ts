import { NextResponse } from "next/server";
import { z } from "zod";
import { insertComplaint } from "@/lib/db/queries";

const complaintSchema = z.object({
  tenant_name: z.string().min(1),
  tenant_email: z.string().email(),
  subject: z.string().min(1),
  description: z.string().min(1),
  property_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = complaintSchema.parse(body);

    const slaDue = new Date();
    slaDue.setDate(slaDue.getDate() + 5);

    if (process.env.DATABASE_URL) {
      await insertComplaint({
        tenantName: data.tenant_name,
        tenantEmail: data.tenant_email,
        subject: data.subject,
        description: data.description,
        propertyId: data.property_id ?? null,
        slaDueAt: slaDue,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to submit complaint" }, { status: 400 });
  }
}
