/**
 * Apply Drizzle SQL plus optional tenant seed to Neon Postgres.
 * Usage: AGENCY_SLUG=pms npm run db:setup
 * Connection: AGENCY_{SLUG}_DATABASE_URL or DATABASE_URL in apps/web/.env.local
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, "apps", "web", ".env.local") });
dotenv.config({ path: join(root, ".env.local") });

const slug = (
  process.env.AGENCY_SLUG?.trim() ||
  process.env.TENANT_ID?.trim() ||
  "pms"
).toLowerCase();

function agencyEnvName(id, suffix) {
  return `AGENCY_${id.replace(/-/g, "_").toUpperCase()}_${suffix}`;
}

async function runSqlFile(sql, filePath, label) {
  if (!existsSync(filePath)) {
    console.warn(`Skip ${label}: file not found (${filePath})`);
    return;
  }
  const sqlContent = readFileSync(filePath, "utf-8");
  const statements = sqlContent
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  console.log(`Running ${statements.length} SQL statements from ${label}...`);
  for (const statement of statements) {
    try {
      await sql(statement);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists") || msg.includes("duplicate key")) {
        console.log("  skip (already exists)");
        continue;
      }
      console.error("Failed:", statement.slice(0, 80), "...", msg);
    }
  }
}

const url =
  process.env[agencyEnvName(slug, "DATABASE_URL")]?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!url) {
  console.error(
    `No database URL for "${slug}". Set ${agencyEnvName(slug, "DATABASE_URL")} or DATABASE_URL in apps/web/.env.local`
  );
  process.exit(1);
}

const sql = neon(url);
const drizzleDir = join(root, "packages", "database", "drizzle");
const migrations = readdirSync(drizzleDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

console.log(`Agency: ${slug}`);
for (const file of migrations) {
  await runSqlFile(sql, join(drizzleDir, file), file);
}

const tenantSeed = join(root, "tenants", slug, "seed.sql");
await runSqlFile(sql, tenantSeed, `tenants/${slug}/seed.sql`);

console.log("Done.");
