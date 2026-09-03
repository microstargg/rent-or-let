import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth/server";
import { updateProperty } from "@/lib/db/queries";
import { syncPropertyToPortals } from "@/lib/portals/sync-worker";
import { adminPropertySchema, toPropertyDbFields } from "@/lib/admin/property-schema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = adminPropertySchema.parse(body);

    await updateProperty(id, toPropertyDbFields(data));

    if (data.status === "available") {
      await syncPropertyToPortals(id, "send");
    } else if (data.status === "archived" || data.status === "let_agreed") {
      await syncPropertyToPortals(id, "remove");
    }

    return NextResponse.json({ id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update property" }, { status: 400 });
  }
}
