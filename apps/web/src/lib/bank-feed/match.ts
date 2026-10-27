export interface MatchCandidate {
  invoiceId: string;
  tenancyId: string;
  amountDue: number;
  dueDate: string;
  renterName: string;
  propertyAddress: string;
  agentRef: string | null;
  paymentRef: string | null;
  remaining: number;
  /** Set by collapseCandidatesByTenancy: balance of the oldest open invoice. */
  oldestRemaining?: number;
}

export interface BankTxnMatchInput {
  amount: number;
  description: string | null;
  counterparty: string | null;
  bookedAt: Date;
}

export type MatchConfidence = "high" | "medium" | "none";

export interface MatchResult {
  confidence: MatchConfidence;
  invoiceId: string | null;
  tenancyId: string | null;
  reason: string;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function haystack(txn: BankTxnMatchInput): string {
  return normalize([txn.description ?? "", txn.counterparty ?? ""].join(" "));
}

function containsToken(hay: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const t = normalize(token);
  if (t.length < 3) return false;
  return hay.includes(t);
}

function uuidPrefix(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toLowerCase();
}

function amountClose(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.011;
}

/**
 * One candidate per tenancy: its oldest open invoice, so a tenant with several open
 * invoices (arrears, or next month already raised) still has one unique match.
 * `remaining` becomes the tenancy's total outstanding; payments spill oldest first.
 */
export function collapseCandidatesByTenancy(candidates: MatchCandidate[]): MatchCandidate[] {
  const byTenancy = new Map<string, MatchCandidate[]>();
  for (const c of candidates) {
    const list = byTenancy.get(c.tenancyId) ?? [];
    list.push(c);
    byTenancy.set(c.tenancyId, list);
  }
  return [...byTenancy.values()].map((list) => {
    const sorted = [...list].sort(
      (a, b) => a.dueDate.localeCompare(b.dueDate) || a.invoiceId.localeCompare(b.invoiceId)
    );
    return {
      ...sorted[0]!,
      oldestRemaining: sorted[0]!.remaining,
      remaining: sorted.reduce((sum, c) => sum + c.remaining, 0),
    };
  });
}

/** Amount equals the oldest invoice's balance or the tenancy's whole balance. */
function amountFits(c: MatchCandidate, amount: number): boolean {
  return amountClose(c.remaining, amount) || amountClose(c.oldestRemaining ?? c.remaining, amount);
}

/**
 * Rank open invoices against an inbound bank credit.
 * High confidence only when a unique strong signal matches (ref or exact amount+name).
 */
export function matchBankTransaction(
  txn: BankTxnMatchInput,
  openInvoices: MatchCandidate[]
): MatchResult {
  const candidates = collapseCandidatesByTenancy(openInvoices);
  if (txn.amount <= 0 || candidates.length === 0) {
    return { confidence: "none", invoiceId: null, tenancyId: null, reason: "No candidates" };
  }

  const text = haystack(txn);
  const amountMatches = candidates.filter((c) => amountFits(c, txn.amount));

  // 0) Unique tenancy payment reference (highest priority)
  const byPaymentRef = candidates.filter((c) => {
    if (!c.paymentRef) return false;
    const compactHay = text.replace(/\s+/g, "");
    const compactRef = normalize(c.paymentRef).replace(/\s+/g, "");
    return (
      text.includes(normalize(c.paymentRef)) ||
      (compactRef.length >= 6 && compactHay.includes(compactRef))
    );
  });
  if (byPaymentRef.length === 1) {
    return {
      confidence: "high",
      invoiceId: byPaymentRef[0].invoiceId,
      tenancyId: byPaymentRef[0].tenancyId,
      reason: "Tenancy payment reference",
    };
  }

  // 1) Invoice id / short id in description
  const byInvoiceId = openInvoices.filter(
    (c) =>
      text.includes(normalize(c.invoiceId)) || text.includes(uuidPrefix(c.invoiceId))
  );
  if (byInvoiceId.length === 1) {
    return {
      confidence: "high",
      invoiceId: byInvoiceId[0].invoiceId,
      tenancyId: byInvoiceId[0].tenancyId,
      reason: "Invoice reference in description",
    };
  }

  // 2) Agent ref / property address fragment
  const byRef = candidates.filter(
    (c) =>
      containsToken(text, c.agentRef) ||
      (c.propertyAddress.length > 8 && containsToken(text, c.propertyAddress.split(",")[0]))
  );
  if (byRef.length === 1 && amountFits(byRef[0], txn.amount)) {
    return {
      confidence: "high",
      invoiceId: byRef[0].invoiceId,
      tenancyId: byRef[0].tenancyId,
      reason: "Property/agent reference + amount",
    };
  }
  if (byRef.length === 1) {
    return {
      confidence: "medium",
      invoiceId: byRef[0].invoiceId,
      tenancyId: byRef[0].tenancyId,
      reason: "Property/agent reference (amount differs)",
    };
  }

  // 3) Exact remaining amount unique among open invoices
  if (amountMatches.length === 1) {
    const only = amountMatches[0];
    const nameHit = containsToken(text, only.renterName.split(" ")[0]) ||
      containsToken(text, only.renterName.split(" ").slice(-1)[0]);
    if (nameHit || text.length < 3) {
      return {
        confidence: nameHit ? "high" : "medium",
        invoiceId: only.invoiceId,
        tenancyId: only.tenancyId,
        reason: nameHit ? "Exact amount + renter name" : "Unique exact amount",
      };
    }
    return {
      confidence: "medium",
      invoiceId: only.invoiceId,
      tenancyId: only.tenancyId,
      reason: "Unique exact amount",
    };
  }

  // 4) Renter name + amount among several amount matches
  const nameAndAmount = amountMatches.filter((c) => {
    const parts = c.renterName.split(/\s+/).filter((p) => p.length > 2);
    return parts.some((p) => containsToken(text, p));
  });
  if (nameAndAmount.length === 1) {
    return {
      confidence: "high",
      invoiceId: nameAndAmount[0].invoiceId,
      tenancyId: nameAndAmount[0].tenancyId,
      reason: "Renter name + amount",
    };
  }

  return { confidence: "none", invoiceId: null, tenancyId: null, reason: "Ambiguous" };
}
