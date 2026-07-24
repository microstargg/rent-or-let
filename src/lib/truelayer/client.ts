export interface TrueLayerTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export interface TrueLayerAccount {
  account_id: string;
  display_name?: string;
  account_type?: string;
  currency?: string;
  account_number?: {
    number?: string;
    sort_code?: string;
    iban?: string;
  };
}

export interface TrueLayerTransaction {
  transaction_id: string;
  timestamp: string;
  description?: string;
  amount: number;
  currency: string;
  transaction_type?: string;
  transaction_category?: string;
  merchant_name?: string;
  meta?: Record<string, unknown>;
}

function authBase(): string {
  return process.env.TRUELAYER_AUTH_URL?.replace(/\/$/, "") ||
    (process.env.TRUELAYER_ENV === "live"
      ? "https://auth.truelayer.com"
      : "https://auth.truelayer-sandbox.com");
}

function apiBase(): string {
  return process.env.TRUELAYER_API_URL?.replace(/\/$/, "") ||
    (process.env.TRUELAYER_ENV === "live"
      ? "https://api.truelayer.com"
      : "https://api.truelayer-sandbox.com");
}

export function isTrueLayerConfigured(): boolean {
  return Boolean(process.env.TRUELAYER_CLIENT_ID && process.env.TRUELAYER_CLIENT_SECRET);
}

export function getTrueLayerRedirectUri(): string {
  if (process.env.TRUELAYER_REDIRECT_URI) return process.env.TRUELAYER_REDIRECT_URI;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${site}/api/admin/bank-feed/callback`;
}

/** Build the AIS auth link for linking a client-money bank account. */
export function buildTrueLayerAuthUrl(state: string): string {
  const clientId = process.env.TRUELAYER_CLIENT_ID;
  if (!clientId) throw new Error("TRUELAYER_CLIENT_ID is not configured");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: getTrueLayerRedirectUri(),
    scope: "info accounts balance transactions offline_access",
    providers: process.env.TRUELAYER_PROVIDERS ?? "uk-ob-all",
    state,
  });
  return `${authBase()}/?${params.toString()}`;
}

async function tokenRequest(body: Record<string, string>): Promise<TrueLayerTokens> {
  const res = await fetch(`${authBase()}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TrueLayer token error ${res.status}: ${text}`);
  }
  return res.json() as Promise<TrueLayerTokens>;
}

export async function exchangeTrueLayerCode(code: string): Promise<TrueLayerTokens> {
  const clientId = process.env.TRUELAYER_CLIENT_ID;
  const clientSecret = process.env.TRUELAYER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("TrueLayer is not configured");
  return tokenRequest({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getTrueLayerRedirectUri(),
    code,
  });
}

export async function refreshTrueLayerToken(refreshToken: string): Promise<TrueLayerTokens> {
  const clientId = process.env.TRUELAYER_CLIENT_ID;
  const clientSecret = process.env.TRUELAYER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("TrueLayer is not configured");
  return tokenRequest({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
}

async function dataGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TrueLayer API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function listTrueLayerAccounts(accessToken: string): Promise<TrueLayerAccount[]> {
  const data = await dataGet<{ results: TrueLayerAccount[] }>(accessToken, "/data/v1/accounts");
  return data.results ?? [];
}

export async function listTrueLayerTransactions(
  accessToken: string,
  accountId: string,
  from: string,
  to: string
): Promise<TrueLayerTransaction[]> {
  const qs = new URLSearchParams({ from, to });
  const data = await dataGet<{ results: TrueLayerTransaction[] }>(
    accessToken,
    `/data/v1/accounts/${encodeURIComponent(accountId)}/transactions?${qs}`
  );
  return data.results ?? [];
}

export function maskAccountNumber(number?: string | null): string | null {
  if (!number) return null;
  const digits = number.replace(/\s/g, "");
  if (digits.length < 4) return "****";
  return `****${digits.slice(-4)}`;
}

export function maskSortCode(sortCode?: string | null): string | null {
  if (!sortCode) return null;
  const digits = sortCode.replace(/\D/g, "");
  if (digits.length < 2) return "**-**-**";
  return `**-**-${digits.slice(-2)}`;
}
