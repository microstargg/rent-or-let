/**
 * Statement PDF helpers — npx tsx scripts/test-statement-pdf.ts
 */
import {
  contentDispositionAttachment,
  parseStatementUploadFilename,
  renderLandlordStatementPdf,
  statementDownloadFilename,
  statementDownloadPath,
} from "../src/lib/pdf/landlord-statement";
import { buildSimplePdf } from "../src/lib/pdf/simple-pdf";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

function asText(bytes: Uint8Array): string {
  return new TextDecoder("latin1").decode(bytes);
}

function main() {
  const names = [
    "Jane O'Brien",
    "José García",
    "Smith & Jones (Holdings)",
    "Müller–Łukasz",
    'Quote "Mark" Ltd',
  ];

  for (const name of names) {
    const pdf = renderLandlordStatementPdf({
      landlordName: name,
      periodFrom: "2026-01-01",
      periodTo: "2026-01-31",
      totals: { rent: 1000, fees: -100, costs: -50, adjustments: 0, net: 850, count: 3 },
      issuedAt: new Date("2026-02-01T12:00:00Z"),
    });
    const text = asText(pdf);
    assert(text.startsWith("%PDF-1.4"), `PDF header for ${name}`);
    assert(text.includes("%%EOF"), `PDF trailer for ${name}`);
    assert(text.includes("/Root 1 0 R"), `PDF catalog for ${name}`);
    assert(pdf.length > 400, `PDF has body for ${name}`);
  }

  const parsed = parseStatementUploadFilename(
    "statement-2026-01-01-2026-01-31-1710000000000.txt"
  );
  assert(parsed?.from === "2026-01-01" && parsed?.to === "2026-01-31", "parses legacy upload filename");
  assert(
    parseStatementUploadFilename("statement-2026-02-01-2026-02-28.pdf")?.to === "2026-02-28",
    "parses pdf upload filename"
  );
  assert(parseStatementUploadFilename("random.bin") === null, "rejects unknown filename");

  const filename = statementDownloadFilename("Jane O'Brien & Sons", "2026-01-01", "2026-01-31");
  assert(filename === "statement-Jane-O-Brien-Sons-2026-01-01-2026-01-31.pdf", `safe filename (${filename})`);
  assert(!filename.includes("'") && !filename.includes("&"), "filename has no raw punctuation");

  const disp = contentDispositionAttachment(`statement-José.pdf`);
  assert(disp.includes("filename="), "content-disposition has ascii filename");
  assert(disp.includes("filename*=UTF-8''"), "content-disposition has utf-8 filename");

  assert(
    statementDownloadPath("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee") ===
      "/api/statements/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/download",
    "download path uses statement id"
  );

  const withWorks = renderLandlordStatementPdf({
    landlordName: "Test Landlord",
    periodFrom: "2026-03-01",
    periodTo: "2026-03-31",
    totals: {
      rent: 1650,
      fees: -165,
      costs: -185,
      adjustments: 0,
      net: 1300,
      count: 5,
      works: [
        {
          dated: "2026-03-15",
          address: "1 High Street",
          summary: "Leaking tap",
          amount: 185,
        },
      ],
      properties: [
        {
          id: "p1",
          address: "1 High Street",
          rent: 750,
          fees: -75,
          costs: -185,
          adjustments: 0,
          net: 490,
          works: [
            {
              dated: "2026-03-15",
              address: "1 High Street",
              summary: "Leaking tap",
              amount: 185,
            },
          ],
        },
        {
          id: "p2",
          address: "2 Low Road",
          rent: 900,
          fees: -90,
          costs: 0,
          adjustments: 0,
          net: 810,
          works: [],
        },
      ],
    },
    issuedAt: new Date("2026-04-01T12:00:00Z"),
  });
  const worksText = asText(withWorks);
  assert(worksText.includes("Leaking tap"), "PDF itemises completed works");
  assert(worksText.includes("1 High Street"), "PDF includes first property address");
  assert(worksText.includes("2 Low Road"), "PDF includes second property address");
  assert(worksText.includes("Portfolio summary"), "PDF has portfolio summary");
  assert(worksText.includes("Property net"), "PDF has per-property net");
  assert(worksText.includes("/Helvetica-Bold"), "PDF uses bold type for headings");
  assert(worksText.includes("\\243") || worksText.includes("£"), "PDF includes sterling amounts");

  const many = buildSimplePdf(
    "Landlord statement",
    Array.from({ length: 80 }, (_, i) => `Line ${i + 1} with (parens) and £ amounts`)
  );
  const manyText = asText(many);
  assert(manyText.includes("(2/"), "long statements paginate");
  assert(manyText.includes("\\("), "parentheses in body are escaped");

  console.log("\nStatement PDF tests: ALL CHECKS PASSED");
}

main();
