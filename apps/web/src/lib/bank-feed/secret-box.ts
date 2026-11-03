import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for secrets stored in the database (an agency's Enable Banking private key).
 * The key comes from BANK_FEED_ENCRYPTION_KEY, so a database dump alone can't sign requests.
 * Format: v1.<iv>.<tag>.<ciphertext>, each base64url.
 */

function key(): Buffer {
  const raw = process.env.BANK_FEED_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      "BANK_FEED_ENCRYPTION_KEY is not set on the server, so bank credentials can't be stored safely."
    );
  }
  // Accept any long random string; hash it to exactly 32 bytes.
  return createHash("sha256").update(raw).digest();
}

export function canEncryptSecrets(): boolean {
  return Boolean(process.env.BANK_FEED_ENCRYPTION_KEY?.trim());
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv, tag, data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function decryptSecret(box: string): string {
  const [version, iv, tag, data] = box.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unrecognised secret format");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
