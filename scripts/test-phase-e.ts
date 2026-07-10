/**
 * Phase E agent test gate — npx tsx scripts/test-phase-e.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db";
import {
  branches,
  landlords,
  properties,
  enquiries,
  tenantApplications,
  tenancies,
  renters,
  landlordProfiles,
} from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  updateEnquiryPipeline,
  createViewing,
  convertApplicationToTenancy,
  createLandlordProfile,
  listPropertiesForLandlord,
  getLandlordProfileByUserId,
} from "../src/lib/db/queries/lettings";
import { listComplianceItems } from "../src/lib/db/queries/compliance";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

async function main() {
  const [branch] = await db.select().from(branches).limit(1);
  assert(branch, "branch exists");
  const suffix = `phase-e-${Date.now()}`;

  const [landlord] = await db
    .insert(landlords)
    .values({
      branchId: branch.id,
      firstName: "Owner",
      lastName: suffix,
      email: `owner-${suffix}@example.com`,
    })
    .returning();
  const [property] = await db
    .insert(properties)
    .values({
      branchId: branch.id,
      landlordId: landlord.id,
      agentRef: suffix,
      slug: suffix,
      displayAddress: `5 Pipe St ${suffix}`,
      street: "Pipe St",
      town: "Testville",
      postcode: "TE5 5ST",
      pricePcm: "1100",
      deposit: "1100",
      availableFrom: "2026-01-01",
      bedrooms: 2,
      propertyType: "flat",
      status: "available",
      description: "test",
      isVacant: true,
    })
    .returning();

  const [enquiry] = await db
    .insert(enquiries)
    .values({
      propertyId: property.id,
      name: "Applicant",
      email: `app-${suffix}@example.com`,
      message: "Interested",
      pipelineStage: "new",
    })
    .returning();

  await updateEnquiryPipeline(enquiry.id, "application");
  const [enq2] = await db.select().from(enquiries).where(eq(enquiries.id, enquiry.id));
  assert(enq2.pipelineStage === "application", "pipeline stage updated");

  const viewing = await createViewing({
    branchId: branch.id,
    propertyId: property.id,
    enquiryId: enquiry.id,
    scheduledAt: new Date(Date.now() + 86400000),
  });
  assert(viewing.id, "viewing booked");
  const [enq3] = await db.select().from(enquiries).where(eq(enquiries.id, enquiry.id));
  assert(enq3.pipelineStage === "viewing_booked", "enquiry moved to viewing_booked");

  const [app] = await db
    .insert(tenantApplications)
    .values({
      propertyId: property.id,
      firstName: "App",
      lastName: suffix,
      email: `tenant-${suffix}@example.com`,
      phone: "07000000000",
      employmentStatus: "employed",
      currentAddress: "1 Old St",
      status: "submitted",
      referencingStatus: "in_progress",
    })
    .returning();

  const converted = await convertApplicationToTenancy(app.id, {
    branchId: branch.id,
    rentAmount: 1100,
    startDate: "2026-07-01",
  });
  assert(converted.tenancy.status === "active", "tenancy created from application");
  const [prop2] = await db.select().from(properties).where(eq(properties.id, property.id));
  assert(prop2.isVacant === false, "property not vacant after convert");
  const checklist = await listComplianceItems(branch.id, property.id);
  assert(
    checklist.some((c) => c.item.tenancyId === converted.tenancy.id),
    "compliance checklist seeded"
  );

  const userId = `landlord-user-${suffix}`;
  await createLandlordProfile({
    userId,
    branchId: branch.id,
    landlordId: landlord.id,
    email: landlord.email!,
  });
  const profile = await getLandlordProfileByUserId(userId);
  assert(profile?.landlord.id === landlord.id, "landlord profile linked");

  const myProps = await listPropertiesForLandlord(landlord.id);
  assert(myProps.some((p) => p.id === property.id), "landlord sees own property");

  const [other] = await db
    .insert(landlords)
    .values({
      branchId: branch.id,
      firstName: "Other",
      lastName: suffix,
      email: `other-${suffix}@example.com`,
    })
    .returning();
  const otherProps = await listPropertiesForLandlord(other.id);
  assert(!otherProps.some((p) => p.id === property.id), "other landlord cannot see property");

  await db.delete(tenancies).where(eq(tenancies.id, converted.tenancy.id));
  await db.delete(renters).where(eq(renters.id, converted.renter.id));
  await db.delete(landlordProfiles).where(eq(landlordProfiles.id, userId));
  await db.delete(properties).where(eq(properties.id, property.id));
  await db.delete(landlords).where(eq(landlords.id, landlord.id));
  await db.delete(landlords).where(eq(landlords.id, other.id));

  console.log("\nPhase E test gate: ALL CHECKS PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
