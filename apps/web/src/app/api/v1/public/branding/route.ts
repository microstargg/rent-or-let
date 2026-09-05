import { NextResponse } from "next/server";
import { publicBranding } from "@repo/config/server";
import { bindAgencyFromRequest } from "@/lib/agency";
import { publicCorsPreflight, withPublicCors } from "@/lib/public-cors";

export async function OPTIONS(request: Request) {
  const agency = bindAgencyFromRequest(request);
  return publicCorsPreflight(agency, request);
}

export async function GET(request: Request) {
  const agency = bindAgencyFromRequest(request);
  const body = publicBranding(agency);
  return withPublicCors(NextResponse.json(body), agency, request);
}
