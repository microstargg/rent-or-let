/**
 * Statement property grouping — npx tsx scripts/test-statement-totals.ts
 */
import { groupLandlordStatementTotals } from "../src/lib/operations/finance/statement-totals";
import { safeNextPath } from "../src/lib/auth/redirect";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";

const totals = groupLandlordStatementTotals({
  propertyAddressById: {
    [a]: "1 High Street",
    [b]: "2 Low Road",
  },
  entries: [
    { propertyId: a, entryType: "rent_received", amount: 750 },
    { propertyId: a, entryType: "management_fee", amount: -75 },
    {
      propertyId: a,
      entryType: "work_order_cost",
      amount: -185,
      work: { dated: "2026-03-15", address: "1 High Street", summary: "Boiler service", amount: 185 },
    },
    { propertyId: b, entryType: "rent_received", amount: 900 },
    { propertyId: b, entryType: "management_fee", amount: -90 },
    { propertyId: null, entryType: "adjustment", amount: -20 },
  ],
});

assert(totals.rent === 1650, "portfolio rent is the sum of properties");
assert(totals.fees === -165, "portfolio fees summed");
assert(totals.costs === -185, "portfolio works cost");
assert(totals.net === 1280, "portfolio net");
assert(totals.properties?.length === 3, "two properties plus unallocated");
assert(totals.properties?.[0].address === "1 High Street", "sorted by address");
assert(totals.properties?.[1].address === "2 Low Road", "second property");
assert(totals.properties?.[2].address === "Unallocated", "null propertyId is unallocated");
assert(totals.properties?.[0].works[0]?.summary === "Boiler service", "works sit on the property");
assert(totals.properties?.[0].net === 490, "property net is rent + fee + works");
assert(totals.works?.[0]?.summary === "Boiler service", "legacy works array still populated");

assert(safeNextPath("/landlord-portal/statements") === "/landlord-portal/statements", "allows portal path");
assert(safeNextPath("https://evil.example") === null, "rejects absolute urls");
assert(safeNextPath("//evil.example") === null, "rejects protocol-relative urls");
assert(safeNextPath("landlord-portal") === null, "rejects non-paths");

console.log("\nStatement totals: ALL CHECKS PASSED");
