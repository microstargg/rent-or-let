import { NextResponse } from "next/server";
import { getAuthForRequest } from "@/lib/auth/factory";
import { bindAgencyFromRequest } from "@/lib/agency";
import { isDemoAgencySlug } from "@/lib/demo/constants";

type AuthRouteContext = { params: Promise<{ path: string[] }> };

/** Shared demo logins: visitors must not be able to lock everyone else out. */
const DEMO_BLOCKED_AUTH_PATHS = new Set([
  "change-password",
  "change-email",
  "update-user",
  "delete-user",
  "set-password",
  "reset-password",
  "request-password-reset",
  "forget-password",
  "revoke-sessions",
  "revoke-other-sessions",
]);

export async function GET(request: Request, context: AuthRouteContext) {
  bindAgencyFromRequest(request);
  const { GET: handle } = getAuthForRequest(request).handler();
  return handle(request, context);
}

export async function POST(request: Request, context: AuthRouteContext) {
  const agency = bindAgencyFromRequest(request);
  if (isDemoAgencySlug(agency.slug)) {
    const { path } = await context.params;
    if (DEMO_BLOCKED_AUTH_PATHS.has(path.join("/"))) {
      return NextResponse.json({ error: "Not available in the demo" }, { status: 403 });
    }
  }
  const { POST: handle } = getAuthForRequest(request).handler();
  return handle(request, context);
}
