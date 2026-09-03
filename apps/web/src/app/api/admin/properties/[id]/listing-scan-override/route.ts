import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { getPropertyById, mergePropertyMetadata } from "@/lib/db/queries";
import { scanListingCopy } from "@/lib/listings/discrimination-scan";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const property = await getPropertyById(id);
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    summary?: string;
    description?: string;
    features?: string[];
  };
  const scan = scanListingCopy({
    summary: body.summary ?? property.summary,
    description: body.description ?? property.description,
    features: body.features ?? property.features,
  });
  await mergePropertyMetadata(id, {
    listing_scan_override: { hash: scan.hash, at: new Date().toISOString() },
  });
  return NextResponse.json({ ok: true, hash: scan.hash });
}
