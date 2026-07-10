/**
 * Phase F agent test gate — npx tsx scripts/test-phase-f.ts
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
  documents,
} from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  protectDeposit,
  createInspection,
  completeInspection,
  createNotice,
  bulkServeRraInfoSheet,
} from "../src/lib/db/queries/lifecycle";
import { listDocumentsForEntity, listComplianceItems } from "../src/lib/db/queries/compliance";
import { createInvoices, markInvoicePaid } from "../src/lib/db/queries/finance";
import { getLandlordBalance } from "../src/lib/db/queries/landlord-finance";
import { createTicket, createWorkOrder, completeWorkOrder, approveWorkOrder, updateWorkOrder } from "../src/lib/db/queries/tickets";
import { updateBranchSettings } from "../src/lib/db/queries/operations";
import { refreshComplianceStatuses } from "../src/lib/db/queries/compliance";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

async function main() {
  const [branch] = await db.select().from(branches).limit(1);
  assert(branch, "branch exists");
  await updateBranchSettings(branch.id, { work_order_approval_threshold: 1000 });
  const suffix = `phase-f-${Date.now()}`;

  const [landlord] = await db
    .insert(landlords)
    .values({ branchId: branch.id, firstName: "LL", lastName: suffix })
    .returning();
  const [property] = await db
    .insert(properties)
    .values({
      branchId: branch.id,
      landlordId: landlord.id,
      agentRef: suffix,
      slug: suffix,
      displayAddress: `6 Life St ${suffix}`,
      street: "Life St",
      town: "Testville",
      postcode: "TE6 6ST",
      pricePcm: "950",
      deposit: "950",
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
    .values({ branchId: branch.id, firstName: "R", lastName: suffix })
    .returning();
  const [tenancy] = await db
    .insert(tenancies)
    .values({
      branchId: branch.id,
      propertyId: property.id,
      primaryRenterId: renter.id,
      rentAmount: "950",
      depositAmount: "950",
      startDate: "2026-01-01",
      status: "active",
    })
    .returning();

  const protectedTenancy = await protectDeposit({
    tenancyId: tenancy.id,
    scheme: "DPS",
    reference: `DPS-${suffix}`,
  });
  assert(protectedTenancy?.depositProtectionRef === `DPS-${suffix}`, "deposit protected");
  const piItems = await listComplianceItems(branch.id, property.id);
  assert(
    piItems.some((i) => i.item.type === "deposit_pi" && i.document?.servedAt),
    "deposit PI served compliance item"
  );

  const inspection = await createInspection({
    branchId: branch.id,
    propertyId: property.id,
    tenancyId: tenancy.id,
    type: "move_in",
  });
  await completeInspection(inspection.id, {
    summary: "All good",
    photoUrls: [`/uploads/inspections/${inspection.id}/photo.txt`],
  });
  const inspDocs = await listDocumentsForEntity("inspection", inspection.id);
  assert(inspDocs.length >= 1, "inspection photos linked");
  const { inspections } = await import("../src/lib/db/schema");
  const [inspRow] = await db.select().from(inspections).where(eq(inspections.id, inspection.id));
  assert(inspRow.completedAt, "inspection completed");
  assert(inspRow.tenancyId === tenancy.id, "inspection linked to tenancy");

  const notice = await createNotice({
    branchId: branch.id,
    tenancyId: tenancy.id,
    type: "section_13",
    effectiveAt: "2026-09-01",
    grounds: "Rent increase",
    serve: true,
  });
  assert(notice.servedAt, "section 13 served");
  assert(notice.documentId, "notice has serve proof document");

  const rra = await bulkServeRraInfoSheet(branch.id);
  assert(rra.served >= 1, "bulk RRA served");
  const rraItems = await listComplianceItems(branch.id, property.id);
  assert(
    rraItems.some((i) => i.item.type === "rra_info_sheet" && i.document?.servedAt),
    "RRA evidence logged"
  );

  // Regression: rent → landlord statement path
  const [inv] = await createInvoices([
    {
      branchId: branch.id,
      tenancyId: tenancy.id,
      type: "rent",
      dueDate: "2099-08-01",
      amount: 950,
    },
  ]);
  await markInvoicePaid(inv.id);
  const llBal = await getLandlordBalance(landlord.id);
  assert(llBal > 0, `rent posted to landlord ledger (got ${llBal})`);

  // Regression: ticket cost
  const ticket = await createTicket({
    branchId: branch.id,
    propertyId: property.id,
    tenancyId: tenancy.id,
    reportedByType: "staff",
    source: "staff",
    summary: "Regression job",
  });
  const wo = await createWorkOrder({
    branchId: branch.id,
    ticketId: ticket.id,
    costEstimate: 50,
  });
  await completeWorkOrder(wo.id, 50);
  const llBal2 = await getLandlordBalance(landlord.id);
  assert(llBal2 < llBal, "work order cost posted to landlord");

  // Regression: compliance refresh
  const refresh = await refreshComplianceStatuses(branch.id);
  assert(typeof refresh.updated === "number", "compliance refresh runs");

  await db.delete(tenancies).where(eq(tenancies.id, tenancy.id));
  await db.delete(renters).where(eq(renters.id, renter.id));
  await db.delete(properties).where(eq(properties.id, property.id));
  await db.delete(landlords).where(eq(landlords.id, landlord.id));

  console.log("\nPhase F test gate: ALL CHECKS PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
