import { NextResponse } from "next/server";
import { bindAgencyFromRequest } from "@/lib/agency";
import { publicCorsPreflight, withPublicCors } from "@/lib/public-cors";
import { getAvailableProperties } from "@/lib/db/queries";
import { toPublicListing } from "@/lib/public-listings";

export async function OPTIONS(request: Request) {
  const agency = bindAgencyFromRequest(request);
  return publicCorsPreflight(agency, request);
}

export async function GET(request: Request) {
  const agency = bindAgencyFromRequest(request);
  const { searchParams } = new URL(request.url);
  const minBedrooms = searchParams.get("minBedrooms");
  const maxRent = searchParams.get("maxRent");
  const town = searchParams.get("town");

  const properties = await getAvailableProperties({
    minBedrooms: minBedrooms ? Number(minBedrooms) : undefined,
    maxRent: maxRent ? Number(maxRent) : undefined,
    town: town || undefined,
  });

  return withPublicCors(
    NextResponse.json({ listings: properties.map(toPublicListing) }),
    agency,
    request
  );
}
