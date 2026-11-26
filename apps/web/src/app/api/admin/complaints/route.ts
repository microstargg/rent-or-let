import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { insertComplaint } from "@/lib/db/queries";
import { actorOf, logActivity } from "@/lib/db/queries/activity";
import { parseJsonBody } from "@/lib/api-validation";

/** Log a complaint that came in by phone, email or in person. */
export async function POST(request: Request) {
  const { session, error } = await requireAdminApi();
  if (error) return error;

  const parsed = await parseJsonBody(
    request,
    z.object({
      tenant_name: z.string().trim().min(1, "Add who complained"),
      tenant_email: z.string().trim().email("That email doesn't look right").or(z.literal("")).optional(),
      subject: z.string().trim().min(1, "Add a subject"),
      description: z.string().trim().min(1, "Say what the complaint is about"),
      property_id: z.string().uuid().nullable().optional(),
      source: z.enum(["phone", "email", "in_person", "letter", "other"]).default("phone"),
    })
  );
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  // Same 5-day first response target as complaints from the website.
  const slaDue = new Date();
  slaDue.setDate(slaDue.getDate() + 5);

  const row = await insertComplaint({
    tenantName: body.tenant_name,
    tenantEmail: body.tenant_email ?? "",
    subject: body.subject,
    description: body.description,
    propertyId: body.property_id ?? null,
    source: body.source,
    slaDueAt: slaDue,
  });
  if (row) {
    await logActivity(actorOf(session), {
      entityType: "complaint",
      entityId: row.id,
      propertyId: body.property_id ?? null,
      action: "complaint.logged",
      summary: `Logged by staff (${body.source.replace("_", " ")})`,
    });
  }
  return NextResponse.json(row, { status: 201 });
}
