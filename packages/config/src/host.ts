/** Edge-safe hostname → agency slug. No secrets, no AsyncLocalStorage. */

export const LETFLOW_ROOT_DOMAIN =
  process.env.LETFLOW_ROOT_DOMAIN?.trim() || "letflow.app";

export const AGENCY_SLUG_HEADER = "x-agency-slug";

/** Cookie used on shared preview hosts (*.vercel.app) to remember the chosen site. */
export const AGENCY_COOKIE_NAME = "lf-agency";

/** Host labels that map onto a registry slug (veri.letflow.app → veri-properties). */
export const AGENCY_SLUG_ALIASES: Record<string, string> = {
  veri: "veri-properties",
  "rent-or-let": "pms",
};

/** Public LetFlow subdomain when it should be shorter than the registry id. */
const PLATFORM_SUBDOMAIN: Record<string, string> = {
  "veri-properties": "veri",
};

export function canonicalizeAgencySlug(
  raw: string | null | undefined
): string | null {
  if (!raw?.trim()) return null;
  const slug = raw.trim().toLowerCase();
  return AGENCY_SLUG_ALIASES[slug] ?? slug;
}

export function defaultPlatformHost(slug: string): string {
  const sub = PLATFORM_SUBDOMAIN[slug] ?? slug;
  return `${sub}.${LETFLOW_ROOT_DOMAIN}`;
}

const RESERVED_LETFLOW_SUBS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "status",
]);

export function hostnameOf(hostHeader: string | null | undefined): string {
  return (hostHeader ?? "").split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
}

export function slugFromLetflowHost(hostname: string): string | null {
  const root = LETFLOW_ROOT_DOMAIN.toLowerCase();
  if (hostname === root) return null;
  if (hostname.endsWith(`.${root}`)) {
    const sub = hostname.slice(0, -(root.length + 1));
    if (!sub || sub.includes(".") || RESERVED_LETFLOW_SUBS.has(sub)) return null;
    return sub;
  }
  return null;
}

/** Local: acme.localhost → acme */
export function slugFromLocalhost(hostname: string): string | null {
  if (hostname.endsWith(".localhost")) {
    const sub = hostname.slice(0, -".localhost".length);
    if (sub && !sub.includes(".")) return sub;
  }
  return null;
}

/** Vercel production/preview aliases where Host cannot identify the agency. */
export function isSharedPreviewHost(hostname: string): boolean {
  return hostname.endsWith(".vercel.app") || hostname.endsWith(".vercel.sh");
}

export function fallbackAgencySlug(): string {
  return (
    process.env.AGENCY_SLUG?.trim() ||
    process.env.TENANT_ID?.trim() ||
    "pms"
  );
}

export function agencyEnvName(slug: string, suffix: string): string {
  return `AGENCY_${slug.replace(/-/g, "_").toUpperCase()}_${suffix}`;
}

export function agencyEnv(slug: string, suffix: string): string | undefined {
  const value = process.env[agencyEnvName(slug, suffix)]?.trim();
  return value || undefined;
}
