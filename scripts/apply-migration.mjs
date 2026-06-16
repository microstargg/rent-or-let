/**
 * Apply a single SQL migration file (one statement per file, or use $$ quoting).
 * Usage: node scripts/apply-migration.mjs drizzle/0002_update_seed_properties.sql
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import pkg from "@next/env";

const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd());

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/apply-migration.mjs <sql-file>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(url);
const content = readFileSync(file, "utf-8");

// Run entire file as one batch via unsafe raw query isn't supported by neon tagged template.
// Split only on semicolons at end of lines (statement terminators).
const statements = content
  .split(/\r?\n/)
  .reduce(
    (acc, line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("--")) return acc;
      acc.current += `${line}\n`;
      if (trimmed.endsWith(";")) {
        acc.stmts.push(acc.current.trim());
        acc.current = "";
      }
      return acc;
    },
    { stmts: [], current: "" }
  ).stmts.filter(Boolean);

console.log(`Running ${statements.length} statements from ${file}...`);

for (const statement of statements) {
  try {
    await sql(statement);
    console.log("OK:", statement.slice(0, 70).replace(/\s+/g, " ") + "...");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("FAILED:", msg);
    console.error(statement.slice(0, 200));
    process.exit(1);
  }
}

console.log("Done.");
