import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function getKey(): Buffer | null {
  const secret = process.env.TRUELAYER_TOKEN_SECRET ?? process.env.NEON_AUTH_COOKIE_SECRET;
  if (!secret) return null;
  return createHash("sha256").update(secret).digest();
}

/** Encrypt a token for storage. Falls back to prefixed plaintext if no secret is configured. */
export function encryptToken(plain: string): string {
  const key = getKey();
  if (!key) return `plain:${plain}`;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

export function decryptToken(stored: string): string {
  if (stored.startsWith("plain:")) return stored.slice("plain:".length);
  if (!stored.startsWith("v1:")) return stored;
  const key = getKey();
  if (!key) throw new Error("TRUELAYER_TOKEN_SECRET required to decrypt bank tokens");
  const [, ivB64, tagB64, dataB64] = stored.split(":");
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
