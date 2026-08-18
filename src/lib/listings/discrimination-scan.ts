/**
 * Deterministic RRA listing scanner. Flags discriminatory or unlawful
 * advertising phrases before portal sync. Staff can override a specific hash.
 */

export interface DiscriminationHit {
  phrase: string;
  reason: string;
}

export interface DiscriminationScanResult {
  hits: DiscriminationHit[];
  hash: string;
  blocked: boolean;
}

const RULES: { pattern: RegExp; phrase: string; reason: string }[] = [
  {
    pattern: /\bno\s*dss\b/i,
    phrase: "No DSS",
    reason: "Cannot refuse tenants who receive benefits.",
  },
  {
    pattern: /\bno\s*benefits?\b/i,
    phrase: "No benefits",
    reason: "Cannot refuse tenants who receive benefits.",
  },
  {
    pattern: /\bno\s*housing\s*benefit\b/i,
    phrase: "No housing benefit",
    reason: "Cannot refuse tenants who receive housing benefit / Universal Credit.",
  },
  {
    pattern: /\bno\s*universal\s*credit\b|\bno\s*uc\b/i,
    phrase: "No Universal Credit",
    reason: "Cannot refuse tenants who receive Universal Credit.",
  },
  {
    pattern: /\bprofessionals?\s+only\b/i,
    phrase: "Professionals only",
    reason: "Occupational restrictions can be discriminatory.",
  },
  {
    pattern: /\bno\s*children\b|\bno\s*kids\b|\bsuitable\s+for\s+professionals\b/i,
    phrase: "No children / professionals only",
    reason: "Cannot discriminate against families with children.",
  },
  {
    pattern: /\bno\s*pets?\b|\bpets?\s+not\s+allowed\b|\bsorry\s+no\s+pets\b/i,
    phrase: "No pets",
    reason: "Blanket pet bans are restricted under the Renters’ Rights Act. Tenants may request a pet.",
  },
  {
    pattern: /\bno\s*dss\s*\/\s*housing\s*benefit\b/i,
    phrase: "No DSS / housing benefit",
    reason: "Cannot refuse tenants who receive benefits.",
  },
  {
    pattern: /\bworking\s+professionals\s+only\b/i,
    phrase: "Working professionals only",
    reason: "Occupational restrictions can be discriminatory.",
  },
  {
    pattern: /\bno\s*dwp\b/i,
    phrase: "No DWP",
    reason: "Cannot refuse tenants who receive benefits.",
  },
  {
    pattern: /\bemployed\s+only\b/i,
    phrase: "Employed only",
    reason: "Occupational restrictions can be discriminatory.",
  },
];

export function listingScanText(input: {
  summary?: string | null;
  description?: string | null;
  features?: string[] | null;
}): string {
  return [input.summary, input.description, ...(input.features ?? [])]
    .filter(Boolean)
    .join("\n");
}

export function hashListingCopy(text: string): string {
  const normalised = text.toLowerCase().replace(/\s+/g, " ").trim();
  let h = 2166136261;
  for (let i = 0; i < normalised.length; i++) {
    h ^= normalised.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function scanListingCopy(input: {
  summary?: string | null;
  description?: string | null;
  features?: string[] | null;
}): DiscriminationScanResult {
  const text = listingScanText(input);
  const hits: DiscriminationHit[] = [];
  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      hits.push({ phrase: rule.phrase, reason: rule.reason });
    }
  }
  return {
    hits,
    hash: hashListingCopy(text),
    blocked: hits.length > 0,
  };
}

export function listingScanOverrideValid(
  override: { hash?: string; at?: string } | null | undefined,
  currentHash: string
): boolean {
  return Boolean(override?.hash && override.hash === currentHash);
}
