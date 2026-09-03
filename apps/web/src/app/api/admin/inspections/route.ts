import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import {
  getDefaultBranch,
  getInspectionById,
  saveInspectionReport,
  createInspection,
  listInspections,
} from "@/lib/db/queries";
import { inspectionReportSchema } from "@/lib/inspections/report";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });
  const rows = await listInspections(branch.id);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });
  const body = (await request.json()) as {
    property_id?: string;
    tenancy_id?: string;
    type?: string;
    scheduled_at?: string;
  };
  if (!body.property_id || !body.type) {
    return NextResponse.json({ error: "property_id and type required" }, { status: 400 });
  }
  const row = await createInspection({
    branchId: branch.id,
    propertyId: body.property_id,
    tenancyId: body.tenancy_id,
    type: body.type,
    scheduledAt: body.scheduled_at ? new Date(body.scheduled_at) : null,
  });
  return NextResponse.json(row, { status: 201 });
}
