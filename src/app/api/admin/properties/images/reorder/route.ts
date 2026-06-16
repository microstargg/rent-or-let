import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSession } from "@/lib/auth/server";
import { reorderPropertyImages } from "@/lib/db/queries";
import { enqueuePortalSync } from "@/lib/portals/sync-queue";

const reorderSchema = z.object({
  property_id: z.string().uuid(),
  image_ids: z.array(z.string().uuid()).min(1),
});

export async function PATCH(request: Request) {
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { property_id, image_ids } = reorderSchema.parse(await request.json());
    await reorderPropertyImages(property_id, image_ids);
    await enqueuePortalSync(property_id, "send");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to reorder images" }, { status: 400 });
  }
}
