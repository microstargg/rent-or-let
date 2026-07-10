/**
 * Phase A agent test gate — run with: npx tsx scripts/test-phase-a.ts
 * Requires DATABASE_URL and existing branch + at least one property/landlord/renter
 * or it will create disposable fixtures.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import {
  branches,
  landlords,
  properties,
  renters,
  tenancies,
  invoices,
  ledgerEntries,
  paymentExceptions,
  payments,
  paymentAllocations,
} from "../src/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  createInvoices,
  markInvoicePaid,
  markInvoicePartialPaid,
  getTenancyBalance,
  listArrears,
  listPaymentExceptions,
  applyLateFeesForBranch,
  getExistingRentInvoicesForDueDate,
} from "../src/lib/db/queries/finance";
import { generateRentInvoicesForBranch } from "../src/lib/operations/rent/generate-invoices";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

async function main() {
  const [branch] = await db.select().from(branches).limit(1);
  assert(branch, "branch exists");

  const suffix = `phase-a-${Date.now()}`;
  const [landlord] = await db
    .insert(landlords)
    .values({
      branchId: branch.id,
      firstName: "Test",
      lastName: suffix,
      email: `${suffix}@example.com`,
    })
    .returning();

  const [property] = await db
    .insert(properties)
    .values({
      branchId: branch.id,
      landlordId: landlord.id,
      agentRef: suffix,
      slug: suffix,
      displayAddress: `1 Test St ${suffix}`,
      street: "Test St",
      town: "Testville",
      postcode: "TE1 1ST",
      pricePcm: "1000",
      deposit: "1000",
      availableFrom: "2026-01-01",
      bedrooms: 2,
      propertyType: "flat",
      status: "let_agreed",
      description: "test",
      isVacant: false,
    })
    .returning();

  const [renter] = await db
    .insert(renters)
    .values({
      branchId: branch.id,
      firstName: "Renter",
      lastName: suffix,
      email: `renter-${suffix}@example.com`,
    })
    .returning();

  const [tenancy] = await db
    .insert(tenancies)
    .values({
      branchId: branch.id,
      propertyId: property.id,
      primaryRenterId: renter.id,
      rentAmount: "1000",
      startDate: "2026-01-01",
      status: "active",
    })
    .returning();

  // 1) Generate rent invoice + charge ledger
  const periodStart = "2099-01-01";
  const gen1 = await generateRentInvoicesForBranch(branch.id, periodStart);
  assert(gen1.created >= 1, "generator creates invoice");
  const gen2 = await generateRentInvoicesForBranch(branch.id, periodStart);
  assert(gen2.created === 0, "generator dedupes same period");

  const dueDate = "2099-02-01";
  const existing = await getExistingRentInvoicesForDueDate(branch.id, dueDate, [tenancy.id]);
  assert(existing.length === 1, "rent invoice exists for due date");

  const [inv] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.tenancyId, tenancy.id), eq(invoices.type, "rent"), eq(invoices.dueDate, dueDate)))
    .limit(1);
  assert(inv, "invoice row found");

  const charges = await db
    .select()
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.invoiceId, inv.id), eq(ledgerEntries.entryType, "charge")));
  assert(charges.length === 1, "charge ledger entry created with invoice");
  assert(Number(await getTenancyBalance(tenancy.id)) === 1000, "balance is 1000 after charge");

  // 2) Partial payment
  const partial = await markInvoicePartialPaid(inv.id, 400);
  assert(partial?.invoice?.status === "partial", "partial payment sets status partial");
  assert(Math.abs(Number(await getTenancyBalance(tenancy.id)) - 600) < 0.01, "balance 600 after partial");

  const underEx = await listPaymentExceptions(branch.id);
  assert(
    underEx.some((e) => e.exception.kind === "underpayment" && e.exception.invoiceId === inv.id),
    "underpayment on exceptions queue"
  );

  // 3) Overpayment on remaining
  const over = await markInvoicePartialPaid(inv.id, 800);
  assert(over?.invoice?.status === "paid", "overpay still settles invoice to paid");
  assert(
    over?.exception?.kind === "overpayment",
    "overpayment exception created"
  );
  const balAfterOver = Number(await getTenancyBalance(tenancy.id));
  assert(Math.abs(balAfterOver - -200) < 0.01, `balance -200 after overpay (got ${balAfterOver})`);

  // 4) Full pay path on a fresh invoice
  const [inv2] = await createInvoices([
    {
      branchId: branch.id,
      tenancyId: tenancy.id,
      type: "rent",
      dueDate: "2099-03-01",
      amount: 500,
    },
  ]);
  const paid = await markInvoicePaid(inv2.id);
  assert(paid?.status === "paid", "mark paid full path");
  const allocs = await db
    .select()
    .from(paymentAllocations)
    .where(eq(paymentAllocations.invoiceId, inv2.id));
  assert(allocs.length === 1 && Number(allocs[0].amount) === 500, "full allocation 500");

  // 5) Late fees — create overdue invoice large enough for positive arrears
  await createInvoices([
    {
      branchId: branch.id,
      tenancyId: tenancy.id,
      type: "rent",
      dueDate: "2020-01-01",
      amount: 500,
    },
  ]);
  const late = await applyLateFeesForBranch(branch.id);
  assert(late.applied >= 1, "late fee applied");
  const lateAgain = await applyLateFeesForBranch(branch.id);
  assert(lateAgain.applied === 0, "late fee idempotent for same source");

  // 6) Arrears board — balance should be positive after overdue charge (+ late fee) on top of -200 credit
  const bal = Number(await getTenancyBalance(tenancy.id));
  assert(bal > 0, `tenancy balance positive for arrears (got ${bal})`);
  const arrears = await listArrears(branch.id);
  assert(
    arrears.some((a) => a.tenancyId === tenancy.id && a.balance > 0),
    "arrears board lists tenancy with positive balance"
  );

  // Cleanup disposable fixtures (best-effort)
  await db.delete(tenancies).where(eq(tenancies.id, tenancy.id));
  await db.delete(renters).where(eq(renters.id, renter.id));
  await db.delete(properties).where(eq(properties.id, property.id));
  await db.delete(landlords).where(eq(landlords.id, landlord.id));

  console.log("\nPhase A test gate: ALL CHECKS PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
