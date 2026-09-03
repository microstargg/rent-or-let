import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { deleteContractor } from "@/lib/db/queries";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  await deleteContractor(id);
  return NextResponse.json({ success: true });
}
