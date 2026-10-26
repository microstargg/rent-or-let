import { getAgencyBySlug, runWithAgencyAsync } from "@repo/config/server";
import { generateLandlordStatements, listLandlordStatements, getLandlordStatementForView } from "../src/lib/db/queries/landlord-finance";
import { renderLandlordStatementPdf, statementDownloadFilename, statementPropertyAddress } from "../src/lib/pdf/landlord-statement";
import { groupStatementsWithProperties } from "../src/lib/finance/statement-format";

const BRANCH = "00000000-0000-0000-0000-000000000001";
function assert(c: unknown, m: string) { if (!c) throw new Error("FAIL: " + m); console.log("PASS: " + m); }

runWithAgencyAsync(getAgencyBySlug("pms"), async () => {
  const created = await generateLandlordStatements(BRANCH, "2026-07-01", "2026-08-31");
  console.log(`\nGenerated ${created.length} overall statements`);
  for (const c of created) {
    const t = c.statement.totals as any;
    const real = (t.properties ?? []).filter((p: any) => p.id);
    console.log(`- ${c.name}: overall net £${t.net.toFixed(2)}, ${real.length} properties -> ${c.propertyStatements.length} property statements`);
    for (const ps of c.propertyStatements) {
      const pt = ps.statement.totals as any;
      console.log(`    · ${ps.address}: net £${pt.net.toFixed(2)} (rent ${pt.rent}, fees ${pt.fees}, works ${pt.costs}, ${pt.works.length} works lines) doc ${ps.document.filename}`);
      assert(ps.statement.parentStatementId === c.statement.id, "linked to overall");
      assert(ps.statement.propertyId, "has property id");
    }
    if (real.length > 1) assert(c.propertyStatements.length === real.length, `${c.name}: one per property`);
    else assert(c.propertyStatements.length === 0, `${c.name}: single property gets overall only`);
    const unalloc = (t.properties ?? []).filter((p: any) => !p.id).reduce((s: number, p: any) => s + p.net, 0);
    const sum = c.propertyStatements.reduce((s, p) => s + (p.statement.totals as any).net, 0);
    if (c.propertyStatements.length) assert(Math.abs(sum + unalloc - t.net) < 0.005, `${c.name}: property nets + unallocated = overall`);

    // view + pdf exactly as the download route does
    for (const ps of c.propertyStatements) {
      const view = await getLandlordStatementForView(ps.statement.id);
      assert(view?.propertyAddress === ps.address, "view resolves property address");
      const pdf = Buffer.from(renderLandlordStatementPdf({ landlordName: view!.landlordName, periodFrom: "2026-07-01", periodTo: "2026-08-31", totals: view!.totals, propertyAddress: view!.propertyAddress, issuedAt: ps.statement.issuedAt })).toString("latin1");
      assert(pdf.startsWith("%PDF") && pdf.includes("Property statement"), "property PDF renders");
      for (const other of c.propertyStatements) if (other !== ps) assert(!pdf.includes(other.address), "PDF excludes other properties");
      console.log("    file:", statementDownloadFilename(view!.landlordName, "2026-07-01", "2026-08-31", view!.propertyAddress));
    }
    const ov = await getLandlordStatementForView(c.statement.id);
    assert(ov?.propertyAddress === null && (ov.totals.properties?.length ?? 0) === (t.properties ?? []).length, "overall statement unchanged shape");
  }

  const grouped = groupStatementsWithProperties(await listLandlordStatements(BRANCH), (r) => statementPropertyAddress(r.statement) ?? "");
  const ids = new Set(created.map((c) => c.statement.id));
  const mine = grouped.filter((g) => ids.has(g.overall.statement.id));
  assert(mine.length === created.length, "list shows each overall statement once at top level");
  assert(mine.every((g) => g.properties.length === created.find((c) => c.statement.id === g.overall.statement.id)!.propertyStatements.length), "list nests property statements under their overall");
  console.log("\nE2E: ALL CHECKS PASSED");
}).catch((e) => { console.error(e); process.exit(1); });
