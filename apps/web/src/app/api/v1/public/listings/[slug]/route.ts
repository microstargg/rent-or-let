import { NextResponse } from "next/server";
import { bindAgencyFromRequest } from "@/lib/agency";
import { publicCorsPreflight, withPublicCors } from "@/lib/public-cors";
import { getPropertyBySlug } from "@/lib/db/queries";
import { toPublicListing } from "@/lib/public-listings";

export async function OPTIONS(request: Request) {
  const agency = bindAgencyFromRequest(request);
  return publicCorsPreflight(agency, request);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const agency = bindAgencyFromRequest(request);
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) {
    return withPublicCors(
      NextResponse.json({ error: "Not found" }, { status: 404 }),
      agency,
      request
    );
  }
  return withPublicCors(NextResponse.json(toPublicListing(property)), agency, request);
}
