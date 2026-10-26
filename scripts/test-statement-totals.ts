/**
 * Statement property grouping — npx tsx scripts/test-statement-totals.ts
 */
import {
  groupLandlordStatementTotals,
  propertiesForIndividualStatements,
  propertyStatementTotals,
} from "../src/lib/operations/finance/statement-totals";
import { groupStatementsWithProperties } from "../src/lib/finance/statement-format";
import {
  renderLandlordStatementPdf,
  statementDownloadFilename,
  statementPropertyAddress,
} from "../src/lib/pdf/landlord-statement";
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

const individual = propertiesForIndividualStatements(totals);
assert(individual.length === 2, "one individual statement per real property, none for unallocated");
const singleProperty = groupLandlordStatementTotals({
  propertyAddressById: { [a]: "1 High Street" },
  entries: [
    { propertyId: a, entryType: "rent_received", amount: 750 },
    { propertyId: null, entryType: "payout", amount: -500 },
  ],
});
assert(
  propertiesForIndividualStatements(singleProperty).length === 0,
  "single-property client gets the overall statement only, even with unallocated lines"
);
const highStreet = propertyStatementTotals(individual[0]);
assert(highStreet.rent === 750 && highStreet.fees === -75, "property statement rent and fee");
assert(highStreet.costs === -185 && highStreet.net === 490, "property statement works and net");
assert(highStreet.count === 3, "property statement counts its own ledger lines");
assert(highStreet.properties?.length === 1, "property statement holds only its property");
assert(highStreet.works?.[0]?.summary === "Boiler service", "property statement itemises works");
const lowRoad = propertyStatementTotals(individual[1]);
assert(lowRoad.works?.length === 0 && lowRoad.net === 810, "second property statement has no works");
assert(
  individual.reduce((sum, p) => sum + p.net, 0) + (totals.properties?.[2].net ?? 0) === totals.net,
  "property statements plus unallocated reconcile to the overall statement"
);

assert(
  statementPropertyAddress({ propertyId: a, totals: highStreet }) === "1 High Street",
  "property statement address read from totals"
);
assert(
  statementPropertyAddress({ propertyId: null, totals }) === null,
  "overall statement has no property address"
);
assert(
  statementDownloadFilename("Jane Smith", "2026-03-01", "2026-03-31", "1 High Street") ===
    "statement-Jane-Smith-1-High-Street-2026-03-01-2026-03-31.pdf",
  "property statement filename includes the property"
);
assert(
  statementDownloadFilename("Jane Smith", "2026-03-01", "2026-03-31") ===
    "statement-Jane-Smith-2026-03-01-2026-03-31.pdf",
  "overall statement filename unchanged"
);
const pdf = Buffer.from(
  renderLandlordStatementPdf({
    landlordName: "Jane Smith",
    periodFrom: "2026-03-01",
    periodTo: "2026-03-31",
    totals: highStreet,
    propertyAddress: "1 High Street",
  })
).toString("latin1");
assert(pdf.includes("Property statement"), "property PDF is titled as a property statement");
assert(!pdf.includes("2 Low Road"), "property PDF leaves out other properties");

const grouped = groupStatementsWithProperties(
  [
    { statement: { id: "p2", parentStatementId: "o1" }, label: "2 Low Road" },
    { statement: { id: "p1", parentStatementId: "o1" }, label: "1 High Street" },
    { statement: { id: "o1", parentStatementId: null }, label: "" },
    { statement: { id: "o0", parentStatementId: null }, label: "" },
    { statement: { id: "orphan", parentStatementId: "gone" }, label: "3 Lost Lane" },
  ],
  (row) => row.label
);
assert(grouped.length === 3, "overall statements and orphans listed at top level");
assert(grouped[0].overall.statement.id === "o1", "overall statement order kept");
assert(
  grouped[0].properties.map((p) => p.statement.id).join(",") === "p1,p2",
  "property statements nested under their overall statement, sorted by address"
);
assert(grouped[1].properties.length === 0, "statement without properties has none nested");

assert(safeNextPath("/landlord-portal/statements") === "/landlord-portal/statements", "allows portal path");
assert(safeNextPath("https://evil.example") === null, "rejects absolute urls");
assert(safeNextPath("//evil.example") === null, "rejects protocol-relative urls");
assert(safeNextPath("landlord-portal") === null, "rejects non-paths");

console.log("\nStatement totals: ALL CHECKS PASSED");
