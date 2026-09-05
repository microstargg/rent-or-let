import { NextResponse, type NextRequest } from "next/server";
import { AGENCY_SLUG_HEADER } from "@repo/config/host";
import { resolveAgencySlug } from "@repo/config/runtime";

export function middleware(request: NextRequest) {
  const slug = resolveAgencySlug(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    request.headers.get(AGENCY_SLUG_HEADER)
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(AGENCY_SLUG_HEADER, slug);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(AGENCY_SLUG_HEADER, slug);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
