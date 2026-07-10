/**
 * Phase D agent test gate — npx tsx scripts/test-phase-d.ts
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
  contractors,
  workOrders,
} from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createTicket,
  createWorkOrder,
  updateWorkOrder,
  completeWorkOrder,
  approveWorkOrder,
  attachDocumentToTicket,
  listWorkOrders,
} from "../src/lib/db/queries/tickets";
import { getLandlordBalance } from "../src/lib/db/queries/landlord-finance";
import { updateBranchSettings } from "../src/lib/db/queries/operations";
import { listDocumentsForEntity } from "../src/lib/db/queries/compliance";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

async function main() {
  const [branch] = await db.select().from(branches).limit(1);
  assert(branch, "branch exists");
  await updateBranchSettings(branch.id, { work_order_approval_threshold: 250 });

  const suffix = `phase-d-${Date.now()}`;
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
      displayAddress: `4 Fix St ${suffix}`,
      street: "Fix St",
      town: "Testville",
      postcode: "TE4 4ST",
      pricePcm: "800",
      deposit: "800",
      availableFrom: "2026-01-01",
      bedrooms: 1,
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
      rentAmount: "800",
      startDate: "2026-01-01",
      status: "active",
    })
    .returning();
  const [contractor] = await db
    .insert(contractors)
    .values({
      branchId: branch.id,
      name: `Plumber ${suffix}`,
      email: `plumber-${suffix}@example.com`,
      trade: "plumbing",
    })
    .returning();

  const ticket = await createTicket({
    branchId: branch.id,
    propertyId: property.id,
    tenancyId: tenancy.id,
    reportedByType: "staff",
    source: "staff",
    summary: "Leaking tap",
    isEmergency: false,
  });

  const dir = join(process.cwd(), "public", "uploads", "tickets", ticket.id);
  await mkdir(dir, { recursive: true });
  const filename = `photo-${Date.now()}.txt`;
  await writeFile(join(dir, filename), "photo");
  const url = `/uploads/tickets/${ticket.id}/${filename}`;
  await attachDocumentToTicket({
    branchId: branch.id,
    ticketId: ticket.id,
    url,
    filename,
  });
  const docs = await listDocumentsForEntity("ticket", ticket.id);
  assert(docs.length >= 1, "ticket photo attachment stored");

  const wo = await createWorkOrder({
    branchId: branch.id,
    ticketId: ticket.id,
    contractorId: contractor.id,
    costEstimate: 500,
  });

  const blocked = await updateWorkOrder(wo.id, { status: "completed", finalCost: 500 });
  assert(
    blocked?.workOrder?.status === "awaiting_approval" || blocked?.blockedForApproval,
    `over-threshold blocks completion (got ${blocked?.workOrder?.status})`
  );

  await approveWorkOrder(wo.id);
  const [afterApprove] = await db.select().from(workOrders).where(eq(workOrders.id, wo.id));
  assert(afterApprove.status === "approved", "approved after staff approval");

  // Assign triggers notify log
  await updateWorkOrder(wo.id, { contractorId: contractor.id, status: "assigned" });
  const [afterAssign] = await db.select().from(workOrders).where(eq(workOrders.id, wo.id));
  const meta = afterAssign.meta as { last_contractor_notify?: { email?: string } };
  assert(meta?.last_contractor_notify?.email, "contractor notify logged");

  const balBefore = await getLandlordBalance(landlord.id);
  await completeWorkOrder(wo.id, 480);
  const [afterComplete] = await db.select().from(workOrders).where(eq(workOrders.id, wo.id));
  assert(afterComplete.status === "completed", "work order completed");
  const balAfter = await getLandlordBalance(landlord.id);
  assert(
    Math.abs(balAfter - (balBefore - 480)) < 0.01,
    `landlord ledger debited 480 (before ${balBefore}, after ${balAfter})`
  );

  const board = await listWorkOrders({ branchId: branch.id });
  assert(
    board.some((j) => j.workOrder.id === wo.id),
    "jobs board lists work order"
  );

  await db.delete(tenancies).where(eq(tenancies.id, tenancy.id));
  await db.delete(renters).where(eq(renters.id, renter.id));
  await db.delete(properties).where(eq(properties.id, property.id));
  await db.delete(landlords).where(eq(landlords.id, landlord.id));
  await db.delete(contractors).where(eq(contractors.id, contractor.id));

  console.log("\nPhase D test gate: ALL CHECKS PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
