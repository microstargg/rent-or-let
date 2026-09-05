import { NextRequest, NextResponse } from "next/server";
import { AGENCY_SLUG_HEADER } from "@repo/config/host";
import { getAgencyBySlug, resolveAgencySlug } from "@repo/config/runtime";
import { getAuthForAgency } from "@/lib/auth/factory";

const PUBLIC_PREFIXES = [
  "/login",
  "/sign-up",
  "/accept-invite",
  "/accept-landlord-invite",
  "/api/",
  "/_next",
  "/agencies/",
];

const AUTH_REQUIRED_PREFIXES = [
  "/portal",
  "/landlord-portal",
  "/auth/continue",
  "/properties",
  "/landlords",
  "/renters",
  "/tenancies",
  "/finance",
  "/compliance",
  "/lifecycle",
  "/pets",
  "/enquiries",
  "/applications",
  "/tickets",
  "/jobs",
  "/inspections",
  "/complaints",
  "/portals",
  "/settings",
];

export default function middleware(request: NextRequest) {
  const slug = resolveAgencySlug(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    request.headers.get(AGENCY_SLUG_HEADER)
  );

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(AGENCY_SLUG_HEADER, slug);
  const requestWithSlug = new NextRequest(request, { headers: requestHeaders });
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/admin" ? "/" : pathname.slice("/admin".length) || "/";
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.headers.set(AGENCY_SLUG_HEADER, slug);
    return redirectResponse;
  }

  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg" ||
    pathname === "/apple-icon.svg";

  const needsAuth =
    pathname === "/" ||
    AUTH_REQUIRED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!isPublic && needsAuth) {
    const agency = getAgencyBySlug(slug);
    const auth = getAuthForAgency(agency);
    return auth.middleware({ loginUrl: "/login" })(requestWithSlug);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set(AGENCY_SLUG_HEADER, slug);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
