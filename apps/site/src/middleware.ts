import { NextResponse, type NextRequest } from "next/server";
import {
  AGENCY_COOKIE_NAME,
  AGENCY_SLUG_HEADER,
  fallbackAgencySlug,
  hostnameOf,
  isSharedPreviewHost,
} from "@repo/config/host";
import {
  agencySlugFromHostname,
  matchAgencySlug,
} from "@repo/config/runtime";

function isPreviewPath(pathname: string) {
  return pathname === "/preview" || pathname.startsWith("/preview/");
}

function rememberAgency(response: NextResponse, slug: string, request: NextRequest) {
  response.cookies.set(AGENCY_COOKIE_NAME, slug, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
}

export function middleware(request: NextRequest) {
  const hostHeader =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const hostname = hostnameOf(hostHeader);
  const querySlug = request.nextUrl.searchParams.get("agency");
  const cookieSlug = request.cookies.get(AGENCY_COOKIE_NAME)?.value;
  const hint =
    querySlug || cookieSlug || request.headers.get(AGENCY_SLUG_HEADER);

  if (isPreviewPath(request.nextUrl.pathname)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete(AGENCY_SLUG_HEADER);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const fromHost = agencySlugFromHostname(hostHeader);
  const slug = fromHost ?? matchAgencySlug(null, hint);

  if (!slug) {
    if (isSharedPreviewHost(hostname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/preview";
      url.search = "";
      const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      if (nextPath && nextPath !== "/") {
        url.searchParams.set("next", nextPath);
      }
      return NextResponse.redirect(url);
    }

    const fallback = fallbackAgencySlug();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(AGENCY_SLUG_HEADER, fallback);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set(AGENCY_SLUG_HEADER, fallback);
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(AGENCY_SLUG_HEADER, slug);

  if (querySlug && !fromHost && matchAgencySlug(null, querySlug) === slug) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("agency");
    const response = NextResponse.redirect(url);
    response.headers.set(AGENCY_SLUG_HEADER, slug);
    rememberAgency(response, slug, request);
    return response;
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(AGENCY_SLUG_HEADER, slug);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
