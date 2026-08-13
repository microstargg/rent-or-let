/**
 * Helper checks for job → invoice dating (no database).
 * npx tsx scripts/test-job-invoice-helpers.ts
 */
import {
  invoiceTypeLabel,
  isTenantPayableInvoiceType,
  isWorksInvoiceType,
  WORKS_INVOICE_TYPE,
} from "../src/lib/operations/maintenance/constants";
import {
  workOrderChargeDate,
  workOrderInvoiceAmount,
  workOrderOccurredAt,
} from "../src/lib/operations/maintenance/work-order-invoice";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

assert(isWorksInvoiceType(WORKS_INVOICE_TYPE), "maintenance is a works invoice");
assert(!isTenantPayableInvoiceType(WORKS_INVOICE_TYPE), "works invoices are not tenant-payable");
assert(isTenantPayableInvoiceType("rent"), "rent is tenant-payable");
assert(invoiceTypeLabel("maintenance") === "Works", "label for maintenance");

assert(
  workOrderChargeDate({ scheduledFor: new Date("2026-03-15T12:00:00.000Z") }) === "2026-03-15",
  "charge date uses scheduled work date"
);
assert(workOrderInvoiceAmount({ finalCost: "480.00", costEstimate: "500" }) === 480, "final cost wins");
assert(workOrderInvoiceAmount({ finalCost: null, costEstimate: "500" }) === 500, "estimate fallback");
assert(workOrderInvoiceAmount({ finalCost: null, costEstimate: null }) === 0, "no amount → 0");
assert(
  workOrderOccurredAt("2026-03-15").toISOString() === "2026-03-15T12:00:00.000Z",
  "ledger occurredAt lands on the work date"
);

console.log("\nJob invoice helpers: ALL CHECKS PASSED");
