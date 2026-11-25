/**
 * Works out which compliance records each property and tenancy should have, and
 * matches them against what has been recorded. A requirement with no record is
 * "missing", so a property with nothing on file no longer looks fully compliant.
 *
 * Pure functions only: callers load the rows and pass them in.
 */

export type ComplianceStatus = "missing" | "valid" | "expiring" | "expired";

/** Who has to act on a requirement. Shown to landlords so nothing is hidden. */
export type Responsible = "agent" | "landlord";

/** Renters' Rights Act Phase 1 commencement (England). */
export const RRA_PHASE_ONE = "2026-05-01";

/** Days before expiry that an item counts as "expiring". */
const WARNING_DAYS: Record<string, number> = {
  // A gas safety check can be done up to 2 months early and keep the old anniversary.
  gas_safety: 60,
  eicr: 90,
  epc: 180,
  hmo_licence: 90,
  selective_licence: 90,
  additional_licence: 90,
};

export function warningDays(type: string): number {
  return WARNING_DAYS[type] ?? 30;
}

export const LICENCE_TYPES = ["hmo_licence", "selective_licence", "additional_licence"] as const;

export interface ComplianceItemLike {
  id: string;
  propertyId: string;
  tenancyId: string | null;
  type: string;
  status: string;
  issuedAt: string | null;
  expiresAt: string | null;
  reference: string | null;
  documentId: string | null;
  meta?: unknown;
  updatedAt?: Date | string | null;
}

/**
 * True when there is something to show the record is real: an uploaded file, a
 * certificate reference, an issue date, or a "seen, not stored" tick.
 * An expiry date typed in on its own is not evidence.
 */
export function hasEvidence(item: Pick<ComplianceItemLike, "documentId" | "reference" | "issuedAt" | "meta">): boolean {
  if (item.documentId || item.reference?.trim() || item.issuedAt) return true;
  const meta = (item.meta ?? {}) as Record<string, unknown>;
  return meta.sighted === true;
}

export function computeStatus(
  expiresAt: string | null | undefined,
  evidence: boolean,
  type?: string,
  today: Date = new Date()
): ComplianceStatus {
  if (!evidence) return "missing";
  if (!expiresAt) return "valid";
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const days = Math.floor((new Date(expiresAt).getTime() - start.getTime()) / 86400000);
  if (days < 0) return "expired";
  if (days <= warningDays(type ?? "")) return "expiring";
  return "valid";
}

export function itemStatus(item: ComplianceItemLike, today?: Date): ComplianceStatus {
  return computeStatus(item.expiresAt, hasEvidence(item), item.type, today);
}

export interface PropertyLike {
  id: string;
  displayAddress: string;
  landlordId?: string | null;
  metadata?: unknown;
}

export interface TenancyLike {
  id: string;
  propertyId: string;
  startDate: string;
  status: string;
  depositAmount?: string | number | null;
}

export interface Requirement {
  /** Stable key: type plus tenancy id when tenancy-specific. */
  key: string;
  type: string;
  propertyId: string;
  tenancyId: string | null;
  /** Plain-English reason the rule applies. */
  reason: string;
  responsible: Responsible;
  status: ComplianceStatus;
  /** The record that meets it, when there is one. */
  item: ComplianceItemLike | null;
  /** False for records the agency added that no rule asks for (e.g. "other"). */
  required: boolean;
  /** Deadline when there is no record to carry an expiry (e.g. register deadline). */
  dueDate?: string | null;
}

export interface PropertyComplianceMeta {
  /** false when the property has no gas supply, so no gas safety record is needed. */
  gasSupply?: boolean;
  /** Council licensing scheme the property falls under. */
  licensing?: "hmo" | "selective" | "additional" | null;
}

export function propertyComplianceMeta(metadata: unknown): PropertyComplianceMeta {
  const m = (metadata ?? {}) as Record<string, unknown>;
  const c = (m.compliance ?? {}) as Record<string, unknown>;
  const licensing = c.licensing;
  return {
    gasSupply: c.gasSupply === false ? false : true,
    licensing:
      licensing === "hmo" || licensing === "selective" || licensing === "additional" ? licensing : null,
  };
}

interface Rule {
  type: string;
  scope: "property" | "tenancy";
  reason: string;
  responsible: Responsible;
}

function propertyRules(meta: PropertyComplianceMeta): Rule[] {
  const rules: Rule[] = [];
  if (meta.gasSupply !== false) {
    rules.push({
      type: "gas_safety",
      scope: "property",
      reason: "Gas appliances must be checked by a Gas Safe engineer every 12 months.",
      responsible: "agent",
    });
  }
  rules.push({
    type: "eicr",
    scope: "property",
    reason: "Electrical installations must be inspected at least every 5 years.",
    responsible: "agent",
  });
  rules.push({
    type: "epc",
    scope: "property",
    reason: "A valid EPC rated E or above is needed to let. EPC C is required for all lets from 1 October 2030.",
    responsible: "agent",
  });
  if (meta.licensing) {
    rules.push({
      type: `${meta.licensing}_licence`,
      scope: "property",
      reason: "The property is in a council licensing scheme and needs a current licence.",
      responsible: "landlord",
    });
  }
  return rules;
}

function tenancyRules(t: TenancyLike): Rule[] {
  const rules: Rule[] = [
    {
      type: "smoke_co",
      scope: "tenancy",
      reason: "Smoke alarms on every storey and CO alarms by fixed combustion appliances, tested on the first day of the tenancy.",
      responsible: "agent",
    },
    {
      type: "right_to_rent",
      scope: "tenancy",
      reason: "Every adult tenant needs a right to rent check before the tenancy starts.",
      responsible: "agent",
    },
    {
      type: "rra_info_sheet",
      scope: "tenancy",
      reason: "Tenants must have the government's Renters' Rights Act information sheet.",
      responsible: "agent",
    },
  ];
  if (Number(t.depositAmount ?? 0) > 0) {
    rules.push({
      type: "deposit_pi",
      scope: "tenancy",
      reason: "The deposit must be protected and prescribed information served within 30 days.",
      responsible: "agent",
    });
  }
  if (t.startDate >= RRA_PHASE_ONE) {
    rules.push({
      type: "written_terms",
      scope: "tenancy",
      reason: "Tenancies from 1 May 2026 need a written statement of terms before they start.",
      responsible: "agent",
    });
  }
  return rules;
}

/** Newest record first: latest expiry, then latest update. */
function newest(items: ComplianceItemLike[]): ComplianceItemLike | null {
  if (!items.length) return null;
  return [...items].sort((a, b) => {
    const e = (b.expiresAt ?? "").localeCompare(a.expiresAt ?? "");
    if (e) return e;
    return String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""));
  })[0]!;
}

const ACTIVE_TENANCY = new Set(["active", "periodic", "notice_given"]);

export function isActiveTenancy(t: TenancyLike): boolean {
  return ACTIVE_TENANCY.has(t.status);
}

/**
 * Every requirement for one property, including tenancy requirements for its
 * active tenancies, plus any extra records the agency has added.
 */
export function propertyRequirements(input: {
  property: PropertyLike;
  tenancies: TenancyLike[];
  items: ComplianceItemLike[];
  /** Tenancies with a signed agreement, which meets the written terms rule. */
  signedAgreementTenancyIds?: Set<string>;
  today?: Date;
}): Requirement[] {
  const { property, items, today } = input;
  const active = input.tenancies.filter((t) => t.propertyId === property.id && isActiveTenancy(t));
  const mine = items.filter((i) => i.propertyId === property.id);
  const meta = propertyComplianceMeta(property.metadata);
  const used = new Set<string>();
  const out: Requirement[] = [];

  for (const rule of propertyRules(meta)) {
    const match = newest(mine.filter((i) => i.type === rule.type));
    mine.filter((i) => i.type === rule.type).forEach((i) => used.add(i.id));
    out.push({
      key: rule.type,
      type: rule.type,
      propertyId: property.id,
      tenancyId: null,
      reason: rule.reason,
      responsible: rule.responsible,
      status: match ? itemStatus(match, today) : "missing",
      item: match,
      required: true,
    });
  }

  for (const t of active) {
    for (const rule of tenancyRules(t)) {
      const candidates = mine.filter((i) => i.type === rule.type && i.tenancyId === t.id);
      candidates.forEach((i) => used.add(i.id));
      const match = newest(candidates);
      let status: ComplianceStatus = match ? itemStatus(match, today) : "missing";
      if (rule.type === "written_terms" && input.signedAgreementTenancyIds?.has(t.id)) status = "valid";
      out.push({
        key: `${rule.type}:${t.id}`,
        type: rule.type,
        propertyId: property.id,
        tenancyId: t.id,
        reason: rule.reason,
        responsible: rule.responsible,
        status,
        item: match,
        required: true,
      });
    }
  }

  // Records no rule asked for (licences for a property not flagged, "other", old
  // tenancies' items are skipped). Keep the newest of each type so they still show.
  const activeIds = new Set(active.map((t) => t.id));
  const extras = mine.filter(
    (i) => !used.has(i.id) && (i.tenancyId === null || activeIds.has(i.tenancyId))
  );
  const byKey = new Map<string, ComplianceItemLike[]>();
  for (const i of extras) {
    const k = i.type === "other" ? `other:${i.id}` : `${i.type}:${i.tenancyId ?? ""}`;
    byKey.set(k, [...(byKey.get(k) ?? []), i]);
  }
  for (const [k, group] of byKey) {
    const match = newest(group)!;
    out.push({
      key: k,
      type: match.type,
      propertyId: property.id,
      tenancyId: match.tenancyId,
      reason: "Added by your agent.",
      responsible: LICENCE_TYPES.includes(match.type as (typeof LICENCE_TYPES)[number]) ? "landlord" : "agent",
      status: itemStatus(match, today),
      item: match,
      required: false,
    });
  }
  return out;
}

export interface ComplianceScore {
  score: number;
  total: number;
  valid: number;
  missing: number;
  expiring: number;
  expired: number;
}

/** Share of requirements that are valid. Expiring counts as half. */
export function scoreRequirements(reqs: Requirement[]): ComplianceScore {
  const counts = { valid: 0, missing: 0, expiring: 0, expired: 0 };
  for (const r of reqs) counts[r.status] += 1;
  const total = reqs.length;
  const score = total ? Math.round(((counts.valid + counts.expiring * 0.5) / total) * 100) : 0;
  return { score, total, ...counts };
}

export const STATUS_ORDER: Record<ComplianceStatus, number> = {
  expired: 0,
  missing: 1,
  expiring: 2,
  valid: 3,
};

export function sortRequirements<
  T extends { status: ComplianceStatus; item: ComplianceItemLike | null; dueDate?: string | null },
>(
  reqs: T[]
): T[] {
  return [...reqs].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (a.item?.expiresAt ?? a.dueDate ?? "9999").localeCompare(b.item?.expiresAt ?? b.dueDate ?? "9999")
  );
}
