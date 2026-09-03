import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireStaffSession } from "@/lib/auth/server";
import { addPropertyImage, countPropertyImages } from "@/lib/db/queries";
import { syncPropertyToPortals } from "@/lib/portals/sync-worker";

export async function POST(request: Request) {
  const session = await requireStaffSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const propertyId = formData.get("property_id") as string;

    if (!file || !propertyId) {
      return NextResponse.json({ error: "Missing file or property_id" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const pathname = `properties/${propertyId}/${Date.now()}.${ext}`;

    let publicUrl: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(pathname, file, { access: "public" });
      publicUrl = blob.url;
    } else {
      // Local dev fallback: store in public/uploads
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const dir = join(process.cwd(), "public", "uploads", propertyId);
      await mkdir(dir, { recursive: true });
      const filename = `${Date.now()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(join(dir, filename), buffer);
      publicUrl = `/uploads/${propertyId}/${filename}`;
    }

    const count = await countPropertyImages(propertyId);
    await addPropertyImage({
      propertyId,
      url: publicUrl,
      sortOrder: count,
      isPrimary: count === 0,
    });

    await syncPropertyToPortals(propertyId, "send");

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
