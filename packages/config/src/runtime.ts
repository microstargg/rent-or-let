import type { TenantConfig } from "./types";
import { tenantRegistry, type TenantId } from "./registry";
import {
  agencyEnv,
  canonicalizeAgencySlug,
  defaultPlatformHost,
  fallbackAgencySlug,
  hostnameOf,
  slugFromLetflowHost,
  slugFromLocalhost,
} from "./host";

export interface AgencyFeatures {
  website: boolean;
}

/** Server/edge secrets + hosts for one agency. Never send this to the client. */
export interface AgencyRuntime {
  slug: string;
  databaseUrl: string;
  neonAuthBaseUrl: string;
  neonAuthCookieSecret: string;
  platformHost: string;
  publicSiteUrl: string | null;
  revalidateUrl: string | null;
  revalidateSecret: string | null;
  features: AgencyFeatures;
}

export interface Agency {
  slug: string;
  config: TenantConfig;
  runtime: AgencyRuntime;
}

export function listAgencySlugs(): TenantId[] {
  const fromEnv = process.env.AGENCY_SLUGS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv?.length) {
    return fromEnv.filter((id): id is TenantId => id in tenantRegistry);
  }
  return Object.keys(tenantRegistry) as TenantId[];
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  return values.find((v) => v && v.length > 0);
}

export function getAgencyRuntime(slug: string): AgencyRuntime {
  const canonical = canonicalizeAgencySlug(slug);
  if (!canonical || !(canonical in tenantRegistry)) {
    throw new Error(
      `Unknown agency slug "${slug}". Valid: ${Object.keys(tenantRegistry).join(", ")}`
    );
  }
  slug = canonical;

  const databaseUrl = firstDefined(
    agencyEnv(slug, "DATABASE_URL"),
    process.env.DATABASE_URL?.trim()
  );
  const neonAuthBaseUrl = firstDefined(
    agencyEnv(slug, "NEON_AUTH_BASE_URL"),
    process.env.NEON_AUTH_BASE_URL?.trim()
  );
  const neonAuthCookieSecret = firstDefined(
    agencyEnv(slug, "NEON_AUTH_COOKIE_SECRET"),
    process.env.NEON_AUTH_COOKIE_SECRET?.trim()
  );

  const isFallback = slug === fallbackAgencySlug();
  const publicSiteUrl =
    agencyEnv(slug, "PUBLIC_SITE_URL") ||
    (isFallback ? process.env.NEXT_PUBLIC_SITE_URL?.trim() : undefined) ||
    tenantRegistry[slug as TenantId].domain;

  const platformHost =
    agencyEnv(slug, "PLATFORM_HOST") || defaultPlatformHost(slug);

  const websiteEnv = agencyEnv(slug, "WEBSITE_ENABLED");
  const website =
    websiteEnv == null
      ? true
      : websiteEnv !== "false" && websiteEnv !== "0";

  return {
    slug,
    databaseUrl: databaseUrl ?? "",
    neonAuthBaseUrl: neonAuthBaseUrl ?? "",
    neonAuthCookieSecret: neonAuthCookieSecret ?? "",
    platformHost,
    publicSiteUrl: publicSiteUrl || null,
    revalidateUrl: agencyEnv(slug, "REVALIDATE_URL") ?? null,
    revalidateSecret: agencyEnv(slug, "REVALIDATE_SECRET") ?? null,
    features: { website },
  };
}

export function getAgencyBySlug(slug: string): Agency {
  const canonical = canonicalizeAgencySlug(slug);
  if (!canonical || !(canonical in tenantRegistry)) {
    throw new Error(
      `Unknown agency slug "${slug}". Valid: ${Object.keys(tenantRegistry).join(", ")}`
    );
  }
  return {
    slug: canonical,
    config: tenantRegistry[canonical as TenantId],
    runtime: getAgencyRuntime(canonical),
  };
}

export function platformUrlFor(agency: Agency): string {
  const explicit = agencyEnv(agency.slug, "PLATFORM_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") {
    const local = process.env.NEXT_PUBLIC_PLATFORM_URL?.trim();
    if (local) return local.replace(/\/$/, "");
    return "http://localhost:3000";
  }
  return `https://${agency.runtime.platformHost}`;
}

export function siteUrlFor(agency: Agency): string | null {
  const url = agency.runtime.publicSiteUrl;
  return url ? url.replace(/\/$/, "") : null;
}

function hostMatchesUrl(hostname: string, urlString: string | null): boolean {
  if (!urlString) return false;
  try {
    const host = new URL(urlString).hostname.toLowerCase();
    return (
      hostname === host ||
      hostname === `www.${host}` ||
      `www.${hostname}` === host
    );
  } catch {
    return false;
  }
}

function registrySlug(raw: string | null): string | null {
  const canonical = canonicalizeAgencySlug(raw);
  if (canonical && canonical in tenantRegistry) return canonical;
  return null;
}

/** Agency implied by Host. Null on shared preview URLs such as *.vercel.app. */
export function agencySlugFromHostname(
  hostHeader: string | null | undefined
): string | null {
  const hostname = hostnameOf(hostHeader);
  const fromLetflow = registrySlug(slugFromLetflowHost(hostname));
  if (fromLetflow) return fromLetflow;

  const fromLocal = registrySlug(slugFromLocalhost(hostname));
  if (fromLocal) return fromLocal;

  for (const slug of listAgencySlugs()) {
    const agency = getAgencyBySlug(slug);
    if (hostMatchesUrl(hostname, siteUrlFor(agency))) return slug;
    if (hostMatchesUrl(hostname, agency.config.domain)) return slug;
    if (hostname === agency.runtime.platformHost.toLowerCase()) return slug;
  }

  return null;
}

/** Host first, then query/cookie/header hint. Null if neither matches. */
export function matchAgencySlug(
  hostHeader: string | null | undefined,
  hint?: string | null
): string | null {
  return agencySlugFromHostname(hostHeader) ?? registrySlug(hint ?? null);
}

/** Resolve agency slug from Host / optional header. */
export function resolveAgencySlug(
  hostHeader: string | null | undefined,
  headerSlug?: string | null
): string {
  return matchAgencySlug(hostHeader, headerSlug) ?? fallbackAgencySlug();
}

export function publicBranding(agency: Agency) {
  const { config, runtime, slug } = agency;
  return {
    slug,
    name: config.name,
    shortName: config.shortName,
    productName: config.productName,
    logo: config.logo,
    theme: config.theme,
    site: config.site,
    platformHost: runtime.platformHost,
    publicSiteUrl: runtime.publicSiteUrl,
    features: runtime.features,
  };
}
