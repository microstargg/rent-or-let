/**
 * Phase G unit tests — npx tsx scripts/test-phase-g.ts
 * Discrimination scan, rent-increase validator, inspection report, pet due dates.
 */
import { scanListingCopy, listingScanOverrideValid } from "../src/lib/listings/discrimination-scan";
import { validateRentIncrease } from "../src/lib/rra/rent-increase";
import { defaultInspectionReport, parseInspectionReport } from "../src/lib/inspections/report";
import { initialPetDueAt, isPetRequestOverdue, addDays } from "../src/lib/rra/pet-request";
import { resolveGoogleModelId } from "../src/lib/ai/client";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

function main() {
  const clean = scanListingCopy({
    summary: "Three-bed terrace in North Ormesby",
    description: "Gas central heating, double glazing, rear yard.",
    features: ["Double glazing"],
  });
  assert(!clean.blocked, "clean listing is not blocked");

  const dirty = scanListingCopy({
    summary: "Professionals only — no DSS, no pets, no children",
    description: "Sorry no housing benefit.",
  });
  assert(dirty.blocked, "discriminatory listing is blocked");
  assert(
    dirty.hits.some((h) => /dss/i.test(h.phrase)) && dirty.hits.some((h) => /pet/i.test(h.phrase)),
    "flags DSS and pets"
  );
  assert(!listingScanOverrideValid({ hash: "nope" }, dirty.hash), "stale override rejected");
  assert(listingScanOverrideValid({ hash: dirty.hash, at: "2026-08-18" }, dirty.hash), "matching override accepted");

  const tooSoon = validateRentIncrease({
    currentRent: 800,
    proposedRent: 850,
    tenancyStart: "2026-06-01",
    serveDate: "2026-08-18",
    effectiveDate: "2026-10-20",
  });
  assert(!tooSoon.ok, "blocks increase within 12 months of start");

  const shortNotice = validateRentIncrease({
    currentRent: 800,
    proposedRent: 850,
    tenancyStart: "2025-01-01",
    serveDate: "2026-08-18",
    effectiveDate: "2026-09-01",
  });
  assert(!shortNotice.ok, "blocks less than two months notice");

  const ok = validateRentIncrease({
    currentRent: 800,
    proposedRent: 850,
    tenancyStart: "2025-01-01",
    serveDate: "2026-08-18",
    effectiveDate: "2026-10-20",
    epcRating: "G",
  });
  assert(ok.ok, "valid increase is allowed");
  assert(ok.issues.some((i) => i.code === "epc_mees" && i.severity === "warn"), "warns on EPC G");

  const report = defaultInspectionReport(2);
  assert(report.rooms.some((r) => r.name === "Bedroom 2"), "default rooms include bedroom 2");
  assert(parseInspectionReport({ report }).rooms.length === report.rooms.length, "parses nested report");

  const requested = new Date("2026-08-01T12:00:00Z");
  const due = initialPetDueAt(requested);
  assert(due.toISOString().slice(0, 10) === "2026-08-29", "pet due date is +28 days");
  assert(
    isPetRequestOverdue({ status: "open", dueAt: addDays(requested, 28), now: new Date("2026-08-30T12:00:00Z") }),
    "open request after due date is overdue"
  );
  assert(
    !isPetRequestOverdue({ status: "approved", dueAt: requested, now: new Date("2026-08-30") }),
    "approved request is not overdue"
  );

  assert(resolveGoogleModelId() === "gemini-3.6-flash", "default Google model is gemini-3.6-flash");
  assert(
    resolveGoogleModelId("gemini-2.5-flash") === "gemini-3.6-flash",
    "retired gemini-2.5-flash remaps to 3.6"
  );
  assert(
    resolveGoogleModelId("google/gemini-2.5-flash") === "gemini-3.6-flash",
    "gateway-prefixed retired ID remaps"
  );
  assert(
    resolveGoogleModelId("gemini-3.6-flash") === "gemini-3.6-flash",
    "current Flash ID is left unchanged"
  );

  console.log("All phase G unit tests passed");
}

main();
