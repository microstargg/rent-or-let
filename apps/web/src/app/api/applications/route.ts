import { NextResponse } from "next/server";
import { z } from "zod";
import { insertTenantApplication } from "@/lib/db/queries";

const applicationSchema = z.object({
  property_id: z.string().uuid().nullable().optional(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  employment_status: z.string().min(1),
  annual_income: z.number().nullable().optional(),
  current_address: z.string().min(1),
  move_in_date: z.string().nullable().optional(),
  occupants: z.number().int().min(1).default(1),
  pets: z.boolean().default(false),
  pets_details: z.string().nullable().optional(),
  additional_info: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = applicationSchema.parse(body);

    if (process.env.DATABASE_URL) {
      await insertTenantApplication({
        propertyId: data.property_id ?? null,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        employmentStatus: data.employment_status,
        annualIncome: data.annual_income ?? null,
        currentAddress: data.current_address,
        moveInDate: data.move_in_date ?? null,
        occupants: data.occupants,
        pets: data.pets,
        petsDetails: data.pets_details ?? null,
        additionalInfo: data.additional_info ?? null,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to submit application" }, { status: 400 });
  }
}
