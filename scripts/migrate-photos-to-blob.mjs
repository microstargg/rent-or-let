/**
 * Move property photos that aren't on Vercel Blob yet (static /properties/... files
 * or legacy WordPress links) into Blob, and point property_images at the new URLs.
 *
 * Dry run by default — prints what it would do and writes nothing.
 *
 * Usage:
 *   node scripts/migrate-photos-to-blob.mjs                 # dry run
 *   node scripts/migrate-photos-to-blob.mjs --apply         # upload + update rows
 *   node scripts/migrate-photos-to-blob.mjs --agency pms    # limit to one agency
 *   node scripts/migrate-photos-to-blob.mjs --fallback-dir property-imports
 *
 * --fallback-dir: where to look for a local file that's missing from apps/web/public,
 * as <dir>/<slug>/<filename> (e.g. property-imports/brogden-green-middlesbrough-ts3/01.jpg).
 *
 * Needs DATABASE_URL and, with --apply, BLOB_READ_WRITE_TOKEN.
 */
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { basename, dirname, extname, join } from "path";
import { fileURLToPath } from "url";
import pkg from "@next/env";

const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "apps", "web", "public");

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const argValue = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const agency = argValue("--agency");
const fallbackDir = argValue("--fallback-dir");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
if (apply && !process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN not set (needed for --apply)");
  process.exit(1);
}

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const sql = neon(process.env.DATABASE_URL);

const rows = await sql`
  SELECT pi.id, pi.property_id, pi.url, p.slug, p.agency_id
  FROM property_images pi
  JOIN properties p ON p.id = pi.property_id
  WHERE pi.url NOT LIKE 'https://%.blob.vercel-storage.com/%'
    AND (${agency ?? null}::text IS NULL OR p.agency_id = ${agency ?? null})
  ORDER BY p.slug, pi.sort_order
`;

async function loadSource(row) {
  if (/^https?:\/\//.test(row.url)) {
    const res = await fetch(row.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  const candidates = [join(publicDir, row.url)];
  if (fallbackDir) {
    candidates.push(join(root, fallbackDir, row.slug, basename(row.url)));
  }
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error(`file not found (tried ${candidates.join(", ")})`);
  return readFile(found);
}

console.log(`${apply ? "APPLY" : "DRY RUN"}: ${rows.length} photo(s) not on Blob\n`);

const failed = [];
let migrated = 0;

for (const row of rows) {
  const filename = basename(new URL(row.url, "http://local").pathname);
  const ext = extname(filename).toLowerCase() || ".jpg";
  const pathname = `properties/${row.property_id}/${filename}`;

  let buffer;
  try {
    buffer = await loadSource(row);
  } catch (error) {
    failed.push({ ...row, reason: error.message });
    console.log(`  MISSING ${row.slug}  ${row.url}  (${error.message})`);
    continue;
  }

  if (!apply) {
    console.log(`  would move ${row.slug}  ${row.url}  -> ${pathname} (${buffer.length} bytes)`);
    continue;
  }

  const blob = await put(pathname, buffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: CONTENT_TYPES[ext] ?? "application/octet-stream",
  });
  await sql`UPDATE property_images SET url = ${blob.url} WHERE id = ${row.id}`;
  migrated++;
  console.log(`  moved ${row.slug}  ${row.url}  -> ${blob.url}`);
}

console.log(
  `\n${apply ? `Moved ${migrated}` : `Would move ${rows.length - failed.length}`}, ` +
    `${failed.length} missing source file(s).`
);
if (failed.length) process.exitCode = 1;
