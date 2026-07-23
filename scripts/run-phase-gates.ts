/**
 * Run domain phase gates A–F. Requires DATABASE_URL (.env.local).
 * Exits 0 when all pass; skips with code 0 if DATABASE_URL is unset (CI without secrets).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { spawnSync } from "child_process";

const phases = ["a", "b", "c", "d", "e", "f"] as const;

if (!process.env.DATABASE_URL) {
  console.log("SKIP: DATABASE_URL not set — phase gates not run");
  process.exit(0);
}

let failed = false;
for (const phase of phases) {
  console.log(`\n=== Phase ${phase.toUpperCase()} ===`);
  const result = spawnSync("npx", ["tsx", `scripts/test-phase-${phase}.ts`], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    failed = true;
    console.error(`Phase ${phase} failed with status ${result.status}`);
  }
}

process.exit(failed ? 1 : 0);
