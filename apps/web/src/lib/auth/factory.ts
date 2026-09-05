import { createNeonAuth } from "@neondatabase/neon-js/auth/next/server";
import { getAgencyBySlug, resolveAgencySlug, type Agency } from "@repo/config/runtime";
import { AGENCY_SLUG_HEADER } from "@repo/config/host";

type NeonAuth = ReturnType<typeof createNeonAuth>;

const authCache = new Map<string, NeonAuth>();

export function getAuthForAgency(agency: Agency): NeonAuth {
  const key = agency.slug;
  let instance = authCache.get(key);
  if (!instance) {
    const baseUrl = agency.runtime.neonAuthBaseUrl;
    const cookieSecret = agency.runtime.neonAuthCookieSecret;
    if (!baseUrl) {
      throw new Error(
        `Missing Neon Auth URL for agency "${agency.slug}". Set AGENCY_*_NEON_AUTH_BASE_URL or NEON_AUTH_BASE_URL.`
      );
    }
    if (!cookieSecret) {
      throw new Error(
        `Missing Neon Auth cookie secret for agency "${agency.slug}". Set AGENCY_*_NEON_AUTH_COOKIE_SECRET or NEON_AUTH_COOKIE_SECRET.`
      );
    }
    instance = createNeonAuth({
      baseUrl,
      cookies: {
        secret: cookieSecret,
        sameSite: "lax",
      },
    });
    authCache.set(key, instance);
  }
  return instance;
}

export function getAuthForRequest(request: Request): NeonAuth {
  const slug = resolveAgencySlug(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    request.headers.get(AGENCY_SLUG_HEADER)
  );
  return getAuthForAgency(getAgencyBySlug(slug));
}
