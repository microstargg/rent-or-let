/**
 * Checks for demo works-invoice seed data (no database).
 * npx tsx scripts/test-seed-demo-work-invoices.ts
 */
import {
  DEMO_WORK_JOBS,
  DEMO_WORK_INVOICE_SEED,
} from "../src/lib/operations/maintenance/seed-demo-work-invoices";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

assert(DEMO_WORK_JOBS.length === 3, "seeds three completed jobs");
assert(DEMO_WORK_INVOICE_SEED === "demo-work-invoices-v1", "stable seed marker");

const ids = [
  ...DEMO_WORK_JOBS.map((j) => j.ticketId),
  ...DEMO_WORK_JOBS.map((j) => j.workOrderId),
];
assert(new Set(ids).size === ids.length, "ticket and work-order ids are unique");
assert(
  ids.every((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  ),
  "ids are UUID v4-shaped"
);

for (const job of DEMO_WORK_JOBS) {
  assert(job.amount > 0 && job.amount <= 250, `${job.key} amount is billable and under approval threshold`);
  assert(job.daysAgo > 0, `${job.key} is dated in the past`);
  assert(job.summary.length > 0, `${job.key} has a summary`);
}

assert(
  new Set(DEMO_WORK_JOBS.map((j) => j.summary)).size === DEMO_WORK_JOBS.length,
  "job summaries are distinct on the invoices list"
);

console.log("\nDemo work invoices: ALL CHECKS PASSED");
