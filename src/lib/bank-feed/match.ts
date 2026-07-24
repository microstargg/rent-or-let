export interface MatchCandidate {
  invoiceId: string;
  tenancyId: string;
  amountDue: number;
  dueDate: string;
  renterName: string;
  propertyAddress: string;
  agentRef: string | null;
  remaining: number;
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
 * Rank open invoices against an inbound bank credit.
 * High confidence only when a unique strong signal matches (ref or exact amount+name).
 */
export function matchBankTransaction(
  txn: BankTxnMatchInput,
  candidates: MatchCandidate[]
): MatchResult {
  if (txn.amount <= 0 || candidates.length === 0) {
    return { confidence: "none", invoiceId: null, tenancyId: null, reason: "No candidates" };
  }

  const text = haystack(txn);
  const amountMatches = candidates.filter((c) => amountClose(c.remaining, txn.amount));

  // 1) Invoice id / short id in description
  const byInvoiceId = candidates.filter(
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
  if (byRef.length === 1 && amountClose(byRef[0].remaining, txn.amount)) {
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
