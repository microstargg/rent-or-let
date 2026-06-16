/**
 * Apply initial schema to Neon Postgres.
 * Usage: node scripts/setup-db.mjs
 * Requires DATABASE_URL in .env.local
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pkg from "@next/env";
const { loadEnvConfig } = pkg;

loadEnvConfig(process.cwd());

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlFile = join(__dirname, "..", "drizzle", "0000_initial.sql");
const sqlContent = readFileSync(sqlFile, "utf-8");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set in .env.local");
  process.exit(1);
}

const sql = neon(url);

// Split on semicolons — skip empty statements
const statements = sqlContent
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"));

console.log(`Running ${statements.length} SQL statements...`);

for (const statement of statements) {
  try {
    await sql(statement);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists")) {
      console.log("  skip (already exists)");
      continue;
    }
    console.error("Failed:", statement.slice(0, 80), "...", msg);
  }
}

console.log("Done.");
