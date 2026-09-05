import { getAuthForRequest } from "@/lib/auth/factory";
import { bindAgencyFromRequest } from "@/lib/agency";

type AuthRouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: AuthRouteContext) {
  bindAgencyFromRequest(request);
  const { GET: handle } = getAuthForRequest(request).handler();
  return handle(request, context);
}

export async function POST(request: Request, context: AuthRouteContext) {
  bindAgencyFromRequest(request);
  const { POST: handle } = getAuthForRequest(request).handler();
  return handle(request, context);
}
