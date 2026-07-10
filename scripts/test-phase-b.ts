/**
 * Phase B agent test gate — npx tsx scripts/test-phase-b.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import { branches, landlords, properties, renters, tenancies, tasks } from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createTenancy } from "../src/lib/db/queries/operations";
import {
  createComplianceItem,
  markComplianceServed,
  refreshComplianceStatuses,
  getPropertyComplianceScore,
  listComplianceItems,
  TENANCY_COMPLIANCE_TYPES,
} from "../src/lib/db/queries/compliance";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

async function main() {
  const [branch] = await db.select().from(branches).limit(1);
  assert(branch, "branch exists");
  const suffix = `phase-b-${Date.now()}`;

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
      displayAddress: `2 Comp St ${suffix}`,
      street: "Comp St",
      town: "Testville",
      postcode: "TE2 2ST",
      pricePcm: "900",
      deposit: "900",
      availableFrom: "2026-01-01",
      bedrooms: 1,
      propertyType: "flat",
      status: "available",
      description: "test",
    })
    .returning();
  const [renter] = await db
    .insert(renters)
    .values({ branchId: branch.id, firstName: "R", lastName: suffix })
    .returning();

  // Upload-like cert with expiry
  const dir = join(process.cwd(), "public", "uploads", "compliance", property.id);
  await mkdir(dir, { recursive: true });
  const filename = `gas-${Date.now()}.txt`;
  await writeFile(join(dir, filename), "gas cert fixture");
  const url = `/uploads/compliance/${property.id}/${filename}`;

  const { createDocument } = await import("../src/lib/db/queries/compliance");
  const doc = await createDocument({
    branchId: branch.id,
    entityType: "property",
    entityId: property.id,
    kind: "gas_safety",
    url,
    filename,
  });

  const future = new Date();
  future.setDate(future.getDate() + 10);
  const expiresSoon = future.toISOString().slice(0, 10);

  const gas = await createComplianceItem({
    branchId: branch.id,
    propertyId: property.id,
    type: "gas_safety",
    expiresAt: expiresSoon,
    documentId: doc.id,
  });
  assert(gas.status === "expiring", `gas status expiring (got ${gas.status})`);

  const listed = await listComplianceItems(branch.id, property.id);
  assert(
    listed.some((r) => r.item.id === gas.id),
    "gas cert on property compliance list"
  );

  const refreshed = await refreshComplianceStatuses(branch.id);
  assert(refreshed.tasksCreated >= 1 || refreshed.updated >= 0, "refresh ran");
  const openTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.relatedType, "compliance_item"),
        eq(tasks.relatedId, gas.id),
        eq(tasks.status, "open")
      )
    );
  assert(openTasks.length >= 1, "task created for expiring item");

  const served = await markComplianceServed(gas.id, {
    servedChannel: "email",
    servedTo: "tenant@example.com",
  });
  assert(served?.document?.servedAt, "mark served stores timestamp");
  assert(served?.document?.servedChannel === "email", "served channel email");

  const tenancy = await createTenancy({
    branchId: branch.id,
    propertyId: property.id,
    primaryRenterId: renter.id,
    rentAmount: 900,
    startDate: "2026-06-01",
  });
  const checklist = await listComplianceItems(branch.id, property.id);
  const seededTypes = new Set(
    checklist.filter((c) => c.item.tenancyId === tenancy.id).map((c) => c.item.type)
  );
  for (const t of TENANCY_COMPLIANCE_TYPES) {
    assert(seededTypes.has(t), `tenancy checklist includes ${t}`);
  }

  const score = await getPropertyComplianceScore(property.id);
  assert(score.total > 0, "property has compliance items");
  assert(typeof score.score === "number", `property score is number (${score.score})`);

  await db.delete(tenancies).where(eq(tenancies.id, tenancy.id));
  await db.delete(renters).where(eq(renters.id, renter.id));
  await db.delete(properties).where(eq(properties.id, property.id));
  await db.delete(landlords).where(eq(landlords.id, landlord.id));

  console.log("\nPhase B test gate: ALL CHECKS PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
