import { createHash } from "crypto";
import { del, get, put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agencyEq, currentAgencyId, ensureAgency } from "@/lib/db/agency-scope";
import { privateFiles } from "@/lib/db/schema";

/**
 * Storage for files that must never be reachable from a public URL: passports,
 * Right to Rent evidence, references and signed agreements.
 *
 * With PRIVATE_BLOB_READ_WRITE_TOKEN set (a Vercel Blob store created as
 * "private", ideally in London), files go there. Without it they are kept in the
 * agency's own database, so the feature works with no extra setup. Either way
 * they are only ever served through a route that checks who is asking.
 */

/** Vercel functions accept request bodies up to 4.5 MB, so uploads stay under that. */
export const PRIVATE_FILE_MAX_BYTES = 4 * 1024 * 1024;

export const PRIVATE_FILE_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/webp": "webp",
};

function blobToken(): string | undefined {
  return process.env.PRIVATE_BLOB_READ_WRITE_TOKEN?.trim() || undefined;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export interface SavedPrivateFile {
  key: string;
  sha256: string;
  size: number;
}

export async function savePrivateFile(opts: {
  /** Folder-style path, without the agency (added here). */
  pathname: string;
  bytes: Uint8Array;
  contentType: string;
}): Promise<SavedPrivateFile> {
  await ensureAgency();
  const sha256 = sha256Hex(opts.bytes);
  const token = blobToken();
  if (token) {
    const blob = await put(`${currentAgencyId()}/${opts.pathname}`, Buffer.from(opts.bytes), {
      access: "private",
      token,
      contentType: opts.contentType,
      addRandomSuffix: true,
    });
    return { key: `blob:${blob.pathname}`, sha256, size: opts.bytes.byteLength };
  }
  const [row] = await db
    .insert(privateFiles)
    .values({
      agencyId: currentAgencyId(),
      contentType: opts.contentType,
      sizeBytes: opts.bytes.byteLength,
      dataBase64: Buffer.from(opts.bytes).toString("base64"),
    })
    .returning({ id: privateFiles.id });
  return { key: `db:${row.id}`, sha256, size: opts.bytes.byteLength };
}

export async function readPrivateFile(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  await ensureAgency();
  if (key.startsWith("db:")) {
    const [row] = await db
      .select({ contentType: privateFiles.contentType, data: privateFiles.dataBase64 })
      .from(privateFiles)
      .where(and(eq(privateFiles.id, key.slice(3)), agencyEq(privateFiles.agencyId)))
      .limit(1);
    if (!row) return null;
    return { bytes: new Uint8Array(Buffer.from(row.data, "base64")), contentType: row.contentType };
  }
  if (key.startsWith("blob:")) {
    const pathname = key.slice(5);
    // Never read another agency's files, whatever key is stored.
    if (!pathname.startsWith(`${currentAgencyId()}/`)) return null;
    const result = await get(pathname, { access: "private", token: blobToken(), useCache: false });
    if (!result || result.statusCode !== 200) return null;
    const bytes = new Uint8Array(await new Response(result.stream).arrayBuffer());
    return { bytes, contentType: result.blob.contentType };
  }
  return null;
}

export async function deletePrivateFile(key: string): Promise<void> {
  await ensureAgency();
  if (key.startsWith("db:")) {
    await db
      .delete(privateFiles)
      .where(and(eq(privateFiles.id, key.slice(3)), agencyEq(privateFiles.agencyId)));
  } else if (key.startsWith("blob:")) {
    const pathname = key.slice(5);
    if (!pathname.startsWith(`${currentAgencyId()}/`)) return;
    await del(pathname, { token: blobToken() });
  }
}

/** A response for a private file: never cached, opened inline for PDFs and images. */
export function privateFileResponse(file: { bytes: Uint8Array; contentType: string }, filename: string): Response {
  const safe = filename.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "document";
  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Work out a file's real type from its first bytes, so a renamed HTML or script
 * file can never be stored and served back as a "document".
 */
export function sniffDocumentType(bytes: Uint8Array): string | null {
  const b = bytes;
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length >= 4 && ascii(0, 4) === "%PDF") return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (b.length >= 12 && ascii(4, 8) === "ftyp" && /^(heic|heix|mif1|msf1|hevc)$/.test(ascii(8, 12))) return "image/heic";
  return null;
}
