/**
 * Seed disposable fixtures for persona E2E.
 * Run: npx tsx scripts/seed-e2e-personas.ts
 *
 * Does not create Neon Auth users — create those in Auth, then link profiles
 * (or accept invites) using the printed emails.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import {
  branches,
  landlords,
  properties,
  renters,
  tenancies,
  invoices,
  tickets,
  complianceItems,
  tasks,
} from "../src/lib/db/schema";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL required");
  }

  let [branch] = await db.select().from(branches).limit(1);
  if (!branch) {
    [branch] = await db
      .insert(branches)
      .values({
        name: "E2E Agency",
        address: "1 Test Street",
        phone: "01642 000000",
        settings: {},
      })
      .returning();
  }

  let [landlord] = await db
    .select()
    .from(landlords)
    .where(eq(landlords.email, "e2e-landlord@example.com"))
    .limit(1);
  if (!landlord) {
    [landlord] = await db
      .insert(landlords)
      .values({
        branchId: branch!.id,
        firstName: "E2E",
        lastName: "Landlord",
        email: "e2e-landlord@example.com",
      })
      .returning();
  }

  let [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.agentRef, "E2E-001"))
    .limit(1);
  if (!property) {
    [property] = await db
      .insert(properties)
      .values({
        branchId: branch!.id,
        landlordId: landlord!.id,
        agentRef: "E2E-001",
        slug: "e2e-test-property",
        displayAddress: "1 E2E Street, Middlesbrough",
        street: "E2E Street",
        town: "Middlesbrough",
        postcode: "TS1 1AA",
        pricePcm: "750",
        deposit: "750",
        availableFrom: "2026-01-01",
        bedrooms: 2,
        propertyType: "flat",
        status: "available",
        description: "Seeded for persona tests",
        isVacant: false,
      })
      .returning();
  }

  let [renter] = await db
    .select()
    .from(renters)
    .where(eq(renters.email, "e2e-tenant@example.com"))
    .limit(1);
  if (!renter) {
    [renter] = await db
      .insert(renters)
      .values({
        branchId: branch!.id,
        firstName: "E2E",
        lastName: "Tenant",
        email: "e2e-tenant@example.com",
      })
      .returning();
  }

  let [tenancy] = await db
    .select()
    .from(tenancies)
    .where(eq(tenancies.propertyId, property!.id))
    .limit(1);
  if (!tenancy) {
    [tenancy] = await db
      .insert(tenancies)
      .values({
        branchId: branch!.id,
        propertyId: property!.id,
        primaryRenterId: renter!.id,
        startDate: "2026-01-01",
        rentAmount: "750",
        status: "active",
      })
      .returning();
  }

  const [existingInvoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.tenancyId, tenancy!.id))
    .limit(1);
  if (!existingInvoice) {
    await db.insert(invoices).values({
      branchId: branch!.id,
      tenancyId: tenancy!.id,
      amount: "750",
      dueDate: "2026-07-01",
      status: "due",
      type: "rent",
    });
  }

  const [existingTicket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.propertyId, property!.id))
    .limit(1);
  if (!existingTicket) {
    await db.insert(tickets).values({
      branchId: branch!.id,
      propertyId: property!.id,
      tenancyId: tenancy!.id,
      summary: "E2E dripping tap",
      status: "open",
      priority: "medium",
      source: "portal",
      reportedByType: "renter",
      reportedById: renter!.id,
    });
  }

  const [existingCompliance] = await db
    .select()
    .from(complianceItems)
    .where(eq(complianceItems.propertyId, property!.id))
    .limit(1);
  if (!existingCompliance) {
    const expires = new Date();
    expires.setDate(expires.getDate() + 14);
    await db.insert(complianceItems).values({
      branchId: branch!.id,
      propertyId: property!.id,
      type: "gas_safety",
      status: "expiring",
      expiresAt: expires.toISOString().slice(0, 10),
    });
  }

  const [existingTask] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.branchId, branch!.id))
    .limit(1);
  if (!existingTask) {
    await db.insert(tasks).values({
      branchId: branch!.id,
      title: "E2E chase gas certificate",
      status: "open",
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      relatedType: "compliance_item",
    });
  }

  console.log(
    JSON.stringify(
      {
        branchId: branch!.id,
        landlordId: landlord!.id,
        landlordEmail: landlord!.email,
        propertyId: property!.id,
        renterId: renter!.id,
        renterEmail: renter!.email,
        tenancyId: tenancy!.id,
        note: "Create Neon Auth users for staff/tenant/landlord emails, then link profiles or accept invites.",
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
