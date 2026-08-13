/**
 * Invoices page query + schema-ensure checks (no live database).
 * npx tsx scripts/test-invoices-query.ts
 */
import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import {
  invoices,
  landlords,
  properties,
  renters,
  tenancies,
} from "../src/lib/db/schema";
import {
  JOB_INVOICE_MIGRATION_STATEMENTS,
  isMissingInvoiceColumnError,
} from "../src/lib/db/ensure-schema";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

const joined = JOB_INVOICE_MIGRATION_STATEMENTS.join("\n");
assert(joined.includes("ADD COLUMN IF NOT EXISTS property_id"), "migration adds property_id");
assert(joined.includes("ADD COLUMN IF NOT EXISTS landlord_id"), "migration adds landlord_id");
assert(joined.includes("ADD COLUMN IF NOT EXISTS work_order_id"), "migration adds work_order_id");
assert(joined.includes("tenancy_id DROP NOT NULL"), "migration allows invoices without a tenancy");
assert(
  joined.includes("landlord_ledger_entries ADD COLUMN IF NOT EXISTS invoice_id"),
  "migration adds ledger invoice_id"
);

assert(
  isMissingInvoiceColumnError(new Error('column "property_id" of relation "invoices" does not exist')),
  "detects missing invoices.property_id"
);
assert(!isMissingInvoiceColumnError(new Error("connection refused")), "ignores unrelated errors");

process.env.DATABASE_URL ??= "postgresql://user:pass@localhost/db?sslmode=require";
const db = drizzle(neon(process.env.DATABASE_URL), {});
const compiled = db
  .select({
    invoice: invoices,
    propertyAddress: properties.displayAddress,
    renterFirstName: renters.firstName,
    renterLastName: renters.lastName,
    landlordFirstName: landlords.firstName,
    landlordLastName: landlords.lastName,
  })
  .from(invoices)
  .leftJoin(tenancies, eq(invoices.tenancyId, tenancies.id))
  .leftJoin(
    properties,
    eq(properties.id, sql`coalesce(${invoices.propertyId}, ${tenancies.propertyId})`)
  )
  .leftJoin(renters, eq(tenancies.primaryRenterId, renters.id))
  .leftJoin(
    landlords,
    eq(landlords.id, sql`coalesce(${invoices.landlordId}, ${properties.landlordId})`)
  )
  .orderBy(desc(invoices.dueDate))
  .toSQL();

assert(compiled.sql.includes('"invoices"."property_id"'), "list query selects property_id");
assert(compiled.sql.includes('"invoices"."landlord_id"'), "list query selects landlord_id");
assert(compiled.sql.includes('"invoices"."work_order_id"'), "list query selects work_order_id");
assert(compiled.sql.includes("coalesce("), "list query coalesces property/landlord joins");
assert(compiled.params.length === 0, "join coalesce is not parameterized");

console.log("\nInvoices query: ALL CHECKS PASSED");
