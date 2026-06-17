import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth/server";
import { createProperty } from "@/lib/db/queries";
import { syncPropertyToPortals } from "@/lib/portals/sync-worker";
import { adminPropertySchema, toPropertyDbFields } from "@/lib/admin/property-schema";
import { slugify } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = adminPropertySchema.parse(body);
    const fields = toPropertyDbFields(data);

    const property = await createProperty({
      ...fields,
      slug: data.slug || slugify(data.display_address),
    });

    if (data.status === "available") {
      await syncPropertyToPortals(property.id, "send");
    }

    return NextResponse.json({ id: property.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create property" }, { status: 400 });
  }
}
