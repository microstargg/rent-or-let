/**
 * Insert sample completed-job works invoices for the default branch.
 * Usage: npx tsx scripts/seed-demo-work-invoices.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { getDefaultBranch } from "../src/lib/db/queries";
import { seedDemoWorkInvoices } from "../src/lib/operations/maintenance/seed-demo-work-invoices";

async function main() {
  const branch = await getDefaultBranch();
  if (!branch) {
    console.error("No branch found");
    process.exit(1);
  }
  const result = await seedDemoWorkInvoices(branch.id);
  console.log(`Demo works invoices: created ${result.created}, skipped ${result.skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
