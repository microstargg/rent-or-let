import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth/server";
import { createProperty, uniquePropertySlug } from "@/lib/db/queries";
import { syncPropertyToPortals } from "@/lib/portals/sync-worker";
import {
  adminPropertySchema,
  propertySaveErrorMessage,
  toPropertyDbFields,
} from "@/lib/admin/property-schema";
import { slugify } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = adminPropertySchema.parse(body);
    const fields = toPropertyDbFields(data);

    const slug = await uniquePropertySlug(data.slug || slugify(data.display_address));
    const property = await createProperty({ ...fields, slug });

    if (data.status === "available") {
      await syncPropertyToPortals(property.id, "send");
      const { notifySiteRevalidate } = await import("@/lib/public-listings");
      await notifySiteRevalidate(["/properties", `/properties/${slug}`, "/"]);
    }

    return NextResponse.json({ id: property.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: propertySaveErrorMessage(error, "Failed to create property") },
      { status: 400 }
    );
  }
}
