import { createPrivateKey } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencyEq, currentAgencyId } from "@/lib/db/agency-scope";
import { bankConnections } from "@/lib/db/schema";
import { ensureBankFeed } from "@/lib/db/queries/bank-feed";
import {
  getEnableBankingConfig,
  type EnableBankingConfig,
} from "@/lib/bank-feed/enable-banking";
import { decryptSecret, encryptSecret } from "@/lib/bank-feed/secret-box";

/**
 * Each agency registers its own Enable Banking application and links its own client account
 * there, so LetFlow never holds bank logins. The app id and private key are stored on a
 * bank_connections row with this provider (no account data on it); the key is encrypted.
 */
export const ENABLE_BANKING_APP_PROVIDER = "enable_banking_app";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function credentialsRow(branchId: string) {
  await ensureBankFeed();
  const [row] = await db
    .select()
    .from(bankConnections)
    .where(
      and(
        agencyEq(bankConnections.agencyId),
        eq(bankConnections.branchId, branchId),
        eq(bankConnections.provider, ENABLE_BANKING_APP_PROVIDER)
      )
    )
    .limit(1);
  return row ?? null;
}

export interface EnableBankingSetupStatus {
  source: "agency" | "platform" | null;
  appId: string | null;
  savedAt: string | null;
}

export async function getEnableBankingSetupStatus(
  agencySlug: string,
  branchId: string
): Promise<EnableBankingSetupStatus> {
  const row = await credentialsRow(branchId);
  if (row?.status === "active" && row.accountId) {
    return { source: "agency", appId: row.accountId, savedAt: row.updatedAt.toISOString() };
  }
  const env = getEnableBankingConfig(agencySlug);
  if (env) return { source: "platform", appId: env.appId, savedAt: null };
  return { source: null, appId: null, savedAt: null };
}

/** The agency's own app if it has set one up, else the platform env app (demo). */
export async function resolveEnableBankingConfig(
  agencySlug: string,
  branchId: string
): Promise<EnableBankingConfig | null> {
  const row = await credentialsRow(branchId);
  if (row?.status === "active" && row.accountId && row.accessTokenEnc) {
    return {
      appId: row.accountId,
      privateKeyPem: decryptSecret(row.accessTokenEnc),
      country: (process.env.ENABLE_BANKING_COUNTRY?.trim() || "GB").toUpperCase(),
      psuType: "business",
    };
  }
  return getEnableBankingConfig(agencySlug);
}

/** Check the pasted id and .pem look right before anything is sent to Enable Banking. */
export function validateCredentials(appId: string, pem: string): string | null {
  if (!UUID_RE.test(appId)) {
    return "The application ID should look like a68b9765-6f21-4456-b3e5-03d2a689265c (it's the .pem file name).";
  }
  if (!pem.includes("PRIVATE KEY")) return "That file isn't a private key. Upload the .pem file Enable Banking downloaded.";
  try {
    const key = createPrivateKey(pem);
    if (key.asymmetricKeyType !== "rsa") return "The key must be an RSA key from Enable Banking.";
  } catch {
    return "That private key couldn't be read. Upload the original .pem file.";
  }
  return null;
}

export function configFromCredentials(appId: string, pem: string): EnableBankingConfig {
  return {
    appId,
    privateKeyPem: pem,
    country: (process.env.ENABLE_BANKING_COUNTRY?.trim() || "GB").toUpperCase(),
    psuType: "business",
  };
}

export async function saveEnableBankingCredentials(branchId: string, appId: string, pem: string) {
  const existing = await credentialsRow(branchId);
  const values = {
    status: "active",
    accountId: appId,
    accountName: "Enable Banking application",
    accessTokenEnc: encryptSecret(pem),
    meta: { kind: "credentials" },
    updatedAt: new Date(),
  };
  if (existing) {
    await db
      .update(bankConnections)
      .set(values)
      .where(and(eq(bankConnections.id, existing.id), agencyEq(bankConnections.agencyId)));
  } else {
    await db.insert(bankConnections).values({
      agencyId: currentAgencyId(),
      branchId,
      provider: ENABLE_BANKING_APP_PROVIDER,
      ...values,
    });
  }
}

/** Forget the agency's app and key. Bank links made with it stop syncing. */
export async function removeEnableBankingCredentials(branchId: string) {
  const existing = await credentialsRow(branchId);
  if (!existing) return false;
  await db
    .update(bankConnections)
    .set({ status: "revoked", accessTokenEnc: null, updatedAt: new Date() })
    .where(and(eq(bankConnections.id, existing.id), agencyEq(bankConnections.agencyId)));
  // Accounts linked through that app can't be read without its key.
  await db
    .update(bankConnections)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(
      and(
        agencyEq(bankConnections.agencyId),
        eq(bankConnections.branchId, branchId),
        eq(bankConnections.provider, "enable_banking"),
        eq(bankConnections.status, "active")
      )
    );
  return true;
}
