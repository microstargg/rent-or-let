import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSession } from "@/lib/auth/server";
import {
  deletePropertyImage,
  getPropertyImage,
  setPropertyImagePrimary,
} from "@/lib/db/queries";
import { syncPropertyToPortals } from "@/lib/portals/sync-worker";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { imageId } = await params;

  try {
    const propertyId = await deletePropertyImage(imageId);
    if (!propertyId) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    await syncPropertyToPortals(propertyId, "send");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}

const patchSchema = z.object({
  is_primary: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { imageId } = await params;

  try {
    const body = patchSchema.parse(await request.json());

    if (body.is_primary) {
      const propertyId = await setPropertyImagePrimary(imageId);
      if (!propertyId) {
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
      }
      await syncPropertyToPortals(propertyId, "send");
      return NextResponse.json({ ok: true });
    }

    const image = await getPropertyImage(imageId);
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update image" }, { status: 400 });
  }
}
