/**
 * Phase C agent test gate — npx tsx scripts/test-phase-c.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { branches, landlords, properties, renters, tenancies } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { createInvoices, markInvoicePaid } from "../src/lib/db/queries/finance";
import {
  getLandlordBalance,
  postLandlordAdjustment,
  generateLandlordStatements,
  createLandlordPayout,
  listLandlordStatements,
} from "../src/lib/db/queries/landlord-finance";
import { getLandlordStatementData } from "../src/lib/db/queries/finance";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

async function main() {
  const [branch] = await db.select().from(branches).limit(1);
  assert(branch, "branch exists");
  const suffix = `phase-c-${Date.now()}`;

  const [landlord] = await db
    .insert(landlords)
    .values({
      branchId: branch.id,
      firstName: "Owner",
      lastName: suffix,
      bankDetails: { sort_code: "00-00-00", account_number: "12345678" },
    })
    .returning();
  const [property] = await db
    .insert(properties)
    .values({
      branchId: branch.id,
      landlordId: landlord.id,
      agentRef: suffix,
      slug: suffix,
      displayAddress: `3 Money St ${suffix}`,
      street: "Money St",
      town: "Testville",
      postcode: "TE3 3ST",
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
    .values({ branchId: branch.id, firstName: "T", lastName: suffix })
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

  const [inv] = await createInvoices([
    {
      branchId: branch.id,
      tenancyId: tenancy.id,
      type: "rent",
      dueDate: "2099-06-01",
      amount: 1000,
    },
  ]);
  await markInvoicePaid(inv.id);

  const bal = await getLandlordBalance(landlord.id);
  // 1000 rent - 10% fee = 900
  assert(Math.abs(bal - 900) < 0.01, `landlord balance 900 after rent+fee (got ${bal})`);

  await postLandlordAdjustment({
    branchId: branch.id,
    landlordId: landlord.id,
    amount: -50,
    memo: "Test debit",
  });
  const bal2 = await getLandlordBalance(landlord.id);
  assert(Math.abs(bal2 - 850) < 0.01, `balance 850 after adjustment (got ${bal2})`);

  const today = new Date().toISOString().slice(0, 10);
  const stmts = await generateLandlordStatements(branch.id, "2020-01-01", today);
  assert(
    stmts.some((s) => s.statement.landlordId === landlord.id),
    "statement generated for landlord"
  );
  assert(stmts[0]?.document?.url, "statement has downloadable document");

  const listed = await listLandlordStatements(branch.id);
  assert(
    listed.some((s) => s.statement.landlordId === landlord.id),
    "statement listed"
  );

  const payout = await createLandlordPayout({
    branchId: branch.id,
    landlordId: landlord.id,
  });
  assert(payout, "payout created");
  const bal3 = await getLandlordBalance(landlord.id);
  assert(Math.abs(bal3) < 0.01, `balance cleared after payout (got ${bal3})`);

  const csvData = await getLandlordStatementData(branch.id, "2020-01-01", today);
  assert(
    csvData.some((r) => r.landlordId === landlord.id && r.total > 0),
    "CSV statement data still works"
  );

  await db.delete(tenancies).where(eq(tenancies.id, tenancy.id));
  await db.delete(renters).where(eq(renters.id, renter.id));
  await db.delete(properties).where(eq(properties.id, property.id));
  await db.delete(landlords).where(eq(landlords.id, landlord.id));

  console.log("\nPhase C test gate: ALL CHECKS PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
