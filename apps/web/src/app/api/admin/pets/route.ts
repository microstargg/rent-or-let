import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { getDefaultBranch, listPetRequests, decidePetRequest } from "@/lib/db/queries";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });
  const rows = await listPetRequests(branch.id);
  return NextResponse.json(rows);
}

export async function PATCH(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const body = (await request.json()) as {
    id?: string;
    status?: "approved" | "refused" | "info_requested" | "awaiting_superior";
    notes?: string;
    served_to?: string;
  };
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }
  const row = await decidePetRequest(body.id, {
    status: body.status,
    notes: body.notes,
    servedTo: body.served_to,
  });
  return NextResponse.json(row);
}
