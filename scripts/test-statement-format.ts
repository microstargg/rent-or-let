/**
 * Statement display helpers — npx tsx scripts/test-statement-format.ts
 */
import {
  formatStatementIssuedAt,
  formatStatementMoney,
  statementAdminPath,
  statementPortalLoginUrl,
  statementPortalPath,
} from "../src/lib/finance/statement-format";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

function main() {
  assert(formatStatementMoney(1300) === "£1,300.00", "formats pounds with two decimals");
  assert(formatStatementMoney(-185) === "-£185.00", "formats negative fees/costs");
  assert(formatStatementMoney(-185, { abs: true }) === "£185.00", "abs option for works lines");
  assert(formatStatementMoney(undefined) === "£0.00", "undefined amounts are zero");
  assert(
    formatStatementIssuedAt(new Date("2026-04-01T12:00:00Z")) === "1 April 2026",
    "formats issued date"
  );
  assert(formatStatementIssuedAt(null) === "—", "missing issued date is an em dash");
  assert(formatStatementIssuedAt("not-a-date") === "—", "invalid issued date is an em dash");

  const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  assert(
    statementAdminPath(id) === `/admin/finance/statements/${id}`,
    "admin preview path"
  );
  assert(
    statementPortalPath(id) === `/landlord-portal/statements/${id}`,
    "landlord portal view path"
  );
  assert(
    statementPortalLoginUrl("https://rent-or-let.vercel.app", id) ===
      `https://rent-or-let.vercel.app/login?next=${encodeURIComponent(`/landlord-portal/statements/${id}`)}`,
    "email/copy link deep-links to the statement"
  );

  console.log("\nStatement format tests: ALL CHECKS PASSED");
}

main();
