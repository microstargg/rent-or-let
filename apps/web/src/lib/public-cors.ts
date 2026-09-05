import { NextResponse } from "next/server";
import { siteUrlFor, type Agency } from "@repo/config/runtime";

function originVariants(urlString: string | null): string[] {
  if (!urlString) return [];
  try {
    const url = new URL(urlString);
    const host = url.hostname.toLowerCase();
    const proto = url.protocol;
    const apex = host.startsWith("www.") ? host.slice(4) : host;
    return [`${proto}//${apex}`, `${proto}//www.${apex}`];
  } catch {
    return [];
  }
}

export function withPublicCors(response: NextResponse, agency: Agency, request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new Set<string>();
  for (const value of originVariants(siteUrlFor(agency))) allowed.add(value);
  for (const value of originVariants(agency.config.domain)) allowed.add(value);
  allowed.add(`https://${agency.runtime.platformHost}`);
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:3001");
    allowed.add("http://127.0.0.1:3001");
  }

  if (origin && allowed.has(origin.replace(/\/$/, ""))) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-Agency-Slug");
  return response;
}

export function publicCorsPreflight(agency: Agency, request: Request) {
  return withPublicCors(new NextResponse(null, { status: 204 }), agency, request);
}
