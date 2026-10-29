import { readFile } from "fs/promises";
import path from "path";
import { parseInspectionReport } from "@/lib/inspections/report";
import { readJpeg, type PdfImage } from "./simple-pdf";

const MAX_PHOTOS = 200;
const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 4;

function reportPhotoUrls(meta: unknown): string[] {
  const report = parseInspectionReport(meta);
  const urls = [
    ...report.meters.map((m) => m.photoUrl).filter(Boolean),
    ...report.rooms.flatMap((r) => [...r.photoUrls, ...r.elements.flatMap((e) => e.photoUrls)]),
  ];
  return [...new Set(urls)].slice(0, MAX_PHOTOS);
}

/** Only our own upload storage: local /uploads in dev, Vercel Blob in production. */
async function fetchPhotoBytes(url: string): Promise<Uint8Array | null> {
  if (url.startsWith("/uploads/inspections/")) {
    const publicDir = path.join(process.cwd(), "public");
    const file = path.normalize(path.join(publicDir, url));
    if (!file.startsWith(path.join(publicDir, "uploads", "inspections"))) return null;
    const buf = await readFile(file).catch(() => null);
    return buf && buf.length <= MAX_BYTES ? new Uint8Array(buf) : null;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".public.blob.vercel-storage.com")) {
    return null;
  }
  const res = await fetch(parsed, { signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(() => null);
  if (!res?.ok) return null;
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  return buf.length <= MAX_BYTES ? buf : null;
}

/** Fetch and decode the inspection's photos for the PDF. Non-JPEGs and failures are left out. */
export async function loadInspectionPhotos(meta: unknown): Promise<Map<string, PdfImage>> {
  const urls = reportPhotoUrls(meta);
  const out = new Map<string, PdfImage>();
  let next = 0;
  async function worker() {
    while (next < urls.length) {
      const url = urls[next++]!;
      const bytes = await fetchPhotoBytes(url).catch(() => null);
      const img = bytes ? readJpeg(bytes) : null;
      if (img) out.set(url, img);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return out;
}
