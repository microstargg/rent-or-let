import { createPrivateKey, createSign } from "node:crypto";

/**
 * Enable Banking (open banking AIS) client.
 *
 * Auth is a short-lived RS256 JWT signed with the application's private key; the
 * application id is the JWT `kid`. Sandbox and production apps use the same API host,
 * the environment is a property of the application itself.
 * Docs: https://enablebanking.com/docs/api/reference/
 */

const API_BASE = "https://api.enablebanking.com";

/** Holds the OAuth-style `state` between starting consent and the bank's redirect back. */
export const EB_STATE_COOKIE = "lf-eb-state";

/** Must match a redirect URL whitelisted on the Enable Banking application. */
export function enableBankingRedirectUrl(request: Request): string {
  const override = process.env.ENABLE_BANKING_REDIRECT_URL?.trim();
  if (override) return override;
  return `${new URL(request.url).origin}/api/admin/bank-feed/enable-banking/callback`;
}

export interface EnableBankingConfig {
  appId: string;
  privateKeyPem: string;
  country: string;
  psuType: "business" | "personal";
}

/** Agencies allowed to see the bank connect button. Defaults to the demo only. */
function allowedAgencies(): string[] {
  const raw = process.env.ENABLE_BANKING_AGENCIES?.trim() || "demo";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function readPrivateKey(): string | null {
  const raw = process.env.ENABLE_BANKING_PRIVATE_KEY?.trim();
  if (!raw) return null;
  if (raw.includes("BEGIN")) return raw.replace(/\\n/g, "\n");
  // Base64 of the whole .pem file, which avoids multi-line env var issues.
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    return decoded.includes("BEGIN") ? decoded : null;
  } catch {
    return null;
  }
}

/** `agencySlug` comes from `await ensureAgency()`; the button only shows for allowed agencies. */
export function getEnableBankingConfig(agencySlug: string): EnableBankingConfig | null {
  const appId = process.env.ENABLE_BANKING_APP_ID?.trim();
  const privateKeyPem = readPrivateKey();
  if (!appId || !privateKeyPem) return null;
  const allowed = allowedAgencies();
  if (!allowed.includes("*") && !allowed.includes(agencySlug)) return null;
  return {
    appId,
    privateKeyPem,
    country: (process.env.ENABLE_BANKING_COUNTRY?.trim() || "GB").toUpperCase(),
    psuType: process.env.ENABLE_BANKING_PSU_TYPE?.trim() === "personal" ? "personal" : "business",
  };
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signEnableBankingJwt(config: EnableBankingConfig, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const header = { typ: "JWT", alg: "RS256", kid: config.appId };
  const payload = { iss: "enablebanking.com", aud: "api.enablebanking.com", iat, exp: iat + 3600 };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(createPrivateKey(config.privateKeyPem));
  return `${signingInput}.${base64url(signature)}`;
}

export class EnableBankingError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown
  ) {
    super(message);
  }
}

async function ebFetch<T>(
  config: EnableBankingConfig,
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${signEnableBankingJwt(config)}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail =
      data && typeof data === "object"
        ? ((data as { message?: string; detail?: unknown }).message ??
          JSON.stringify((data as { detail?: unknown }).detail ?? data))
        : String(data ?? "");
    throw new EnableBankingError(
      `Enable Banking ${init.method ?? "GET"} ${path.split("?")[0]} failed (${res.status}): ${detail}`.slice(0, 500),
      res.status,
      data
    );
  }
  return data as T;
}

export interface EbAspsp {
  name: string;
  country: string;
  logo?: string;
  beta?: boolean;
  psu_types?: string[];
  maximum_consent_validity?: number;
}

/** Banks for one country, or every bank Enable Banking offers when `country` is null. */
export async function listAspsps(
  config: EnableBankingConfig,
  country: string | null = config.country
): Promise<EbAspsp[]> {
  const qs = country ? `?country=${encodeURIComponent(country)}` : "";
  const data = await ebFetch<{ aspsps?: EbAspsp[] }>(config, `/aspsps${qs}`);
  return data.aspsps ?? [];
}

/**
 * Banks to offer in the picker. Sandbox apps often have no banks for GB, only the
 * Mock ASPSP and a few EU sandboxes, so fall back to the full list rather than show nothing.
 */
export async function listBanksForPicker(config: EnableBankingConfig): Promise<EbAspsp[]> {
  const local = await listAspsps(config);
  if (local.length) return local;
  const all = await listAspsps(config, null);
  // One entry per bank name, preferring the configured country, then the first listed.
  const byName = new Map<string, EbAspsp>();
  for (const b of all) {
    const seen = byName.get(b.name);
    if (!seen || (b.country === config.country && seen.country !== config.country)) byName.set(b.name, b);
  }
  return [...byName.values()];
}

export async function startAuthorisation(
  config: EnableBankingConfig,
  opts: { bank: string; country?: string; redirectUrl: string; state: string; validForSeconds?: number }
): Promise<{ url: string; authorization_id?: string }> {
  // UK banks allow 90 days before the customer must reconfirm; ask for that or less.
  // A minute of slack so a bank's exact maximum isn't overshot by clock drift.
  const seconds = Math.min(opts.validForSeconds || 90 * 24 * 3600, 90 * 24 * 3600) - 60;
  const validUntil = new Date(Date.now() + seconds * 1000).toISOString();
  return ebFetch(config, "/auth", {
    method: "POST",
    body: {
      access: { valid_until: validUntil },
      aspsp: { name: opts.bank, country: opts.country ?? config.country },
      state: opts.state,
      redirect_url: opts.redirectUrl,
      psu_type: config.psuType,
    },
  });
}

export interface EbAccount {
  uid: string;
  name?: string | null;
  currency?: string | null;
  product?: string | null;
  account_id?: {
    iban?: string | null;
    other?: { identification?: string | null; scheme_name?: string | null } | null;
  } | null;
}

export interface EbSession {
  session_id: string;
  accounts: EbAccount[];
  aspsp: { name: string; country: string };
  access?: { valid_until?: string };
}

export async function createSession(config: EnableBankingConfig, code: string): Promise<EbSession> {
  return ebFetch(config, "/sessions", { method: "POST", body: { code } });
}

export async function deleteSession(config: EnableBankingConfig, sessionId: string): Promise<void> {
  await ebFetch(config, `/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
}

export interface EbTransaction {
  entry_reference?: string | null;
  transaction_id?: string | null;
  transaction_amount: { amount: string; currency: string };
  credit_debit_indicator?: "CRDT" | "DBIT" | string | null;
  status?: string | null;
  booking_date?: string | null;
  value_date?: string | null;
  transaction_date?: string | null;
  remittance_information?: string[] | null;
  creditor?: { name?: string | null } | null;
  debtor?: { name?: string | null } | null;
  reference_number?: string | null;
  note?: string | null;
  balance_after_transaction?: { amount?: string; currency?: string } | null;
}

/** All booked transactions since `dateFrom` (YYYY-MM-DD), following continuation keys. */
export async function listAccountTransactions(
  config: EnableBankingConfig,
  accountUid: string,
  dateFrom: string
): Promise<EbTransaction[]> {
  const out: EbTransaction[] = [];
  let continuationKey: string | null = null;
  for (let page = 0; page < 50; page++) {
    const qs = new URLSearchParams({ date_from: dateFrom });
    if (continuationKey) qs.set("continuation_key", continuationKey);
    const data: { transactions?: EbTransaction[]; continuation_key?: string | null } = await ebFetch(
      config,
      `/accounts/${encodeURIComponent(accountUid)}/transactions?${qs}`
    );
    out.push(...(data.transactions ?? []));
    continuationKey = data.continuation_key ?? null;
    if (!continuationKey) break;
  }
  return out;
}

/** Account number shown as ****1234 (UK "other" id is sort code + account number). */
export function accountMask(account: EbAccount): { account: string | null; sortCode: string | null } {
  const iban = account.account_id?.iban?.replace(/\s/g, "") ?? null;
  const other = account.account_id?.other?.identification?.replace(/\D/g, "") ?? null;
  const digits = other && other.length >= 14 ? other : iban;
  if (!digits) return { account: null, sortCode: null };
  const last4 = digits.slice(-4);
  let sortCode: string | null = null;
  if (other && other.length === 14) sortCode = `**-**-${other.slice(4, 6)}`;
  return { account: `****${last4}`, sortCode };
}
