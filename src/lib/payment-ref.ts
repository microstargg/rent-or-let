import { createHash, randomBytes } from "crypto";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 — bank-safe

export function getPaymentRefFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const ref = (metadata as { payment_ref?: unknown }).payment_ref;
  return typeof ref === "string" && ref.length > 0 ? ref : null;
}

export function withPaymentRef(
  metadata: Record<string, unknown> | null | undefined,
  paymentRef: string
): Record<string, unknown> {
  return { ...(metadata ?? {}), payment_ref: paymentRef };
}

/** Generate ROL-XXXXXX (6 chars, uppercase alphanumeric, bank-safe). */
export function generatePaymentRefCode(): string {
  const bytes = randomBytes(6);
  let body = "";
  for (let i = 0; i < 6; i++) {
    body += REF_ALPHABET[bytes[i]! % REF_ALPHABET.length];
  }
  return `ROL-${body}`;
}

export function normalizePaymentRef(ref: string): string {
  return ref.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Stable id for CSV row idempotency. */
export function csvProviderTxnId(date: string, amount: number, description: string): string {
  const raw = `${date}|${amount.toFixed(2)}|${description.trim().toLowerCase()}`;
  const hash = createHash("sha256").update(raw).digest("hex").slice(0, 24);
  return `csv_${hash}`;
}
