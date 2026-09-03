/**
 * Apply initial schema and optional tenant seed to Neon Postgres.
 * Usage: TENANT_ID=pms node scripts/setup-db.mjs
 * Requires DATABASE_URL in apps/web/.env.local
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, "apps", "web", ".env.local") });
dotenv.config({ path: join(root, ".env.local") });

const tenantId = process.env.TENANT_ID ?? "pms";

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

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set in apps/web/.env.local");
  process.exit(1);
}

const sql = neon(url);

await runSqlFile(
  sql,
  join(root, "packages", "database", "drizzle", "0000_initial.sql"),
  "0000_initial.sql"
);

const tenantSeed = join(root, "tenants", tenantId, "seed.sql");
await runSqlFile(sql, tenantSeed, `tenants/${tenantId}/seed.sql`);

console.log("Done.");
