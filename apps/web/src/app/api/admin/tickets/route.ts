import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import {
  createTicket,
  updateTicketStatus,
  addTicketMessage,
  createWorkOrder,
  updateWorkOrder,
  getDefaultBranch,
} from "@/lib/db/queries";

const createSchema = z.object({
  property_id: z.string().uuid(),
  tenancy_id: z.string().uuid().optional().nullable(),
  summary: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  location_area: z.string().optional(),
});

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const branch = await getDefaultBranch();
  if (!branch) {
    return NextResponse.json({ error: "No branch configured" }, { status: 400 });
  }

  const body = createSchema.parse(await request.json());
  const row = await createTicket({
    branchId: branch.id,
    propertyId: body.property_id,
    tenancyId: body.tenancy_id,
    reportedByType: "staff",
    source: "staff",
    summary: body.summary,
    description: body.description,
    category: body.category,
    priority: body.priority,
    locationArea: body.location_area,
  });
  return NextResponse.json(row, { status: 201 });
}
