import { buildSimplePdf } from "./simple-pdf";
import { siteContent } from "@/lib/content/site";

export interface LandlordStatementWorkLine {
  dated: string;
  address: string;
  summary: string;
  amount: number;
}

export interface LandlordStatementTotals {
  rent?: number;
  fees?: number;
  costs?: number;
  adjustments?: number;
  net?: number;
  count?: number;
  works?: LandlordStatementWorkLine[];
}

export interface LandlordStatementPdfInput {
  landlordName: string;
  periodFrom: string;
  periodTo: string;
  totals: LandlordStatementTotals;
  issuedAt?: Date | string | null;
  agencyName?: string;
}

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

function money(value: number | undefined): string {
  return GBP.format(Number(value ?? 0));
}

function worksPdfLines(works: LandlordStatementWorkLine[] | undefined): string[] {
  if (!works?.length) return [];
  const lines = ["Works:"];
  for (const work of works) {
    const address = work.address ? `  ${work.address}` : "";
    lines.push(
      `  ${work.dated}${address}  ${work.summary}  ${money(Math.abs(work.amount))}`
    );
  }
  return lines;
}

function formatIssuedAt(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function parseStatementUploadFilename(
  filename: string
): { from: string; to: string } | null {
  const base = filename.split("/").pop() ?? filename;
  const match = base.match(/^statement-(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})/i);
  if (!match) return null;
  return { from: match[1], to: match[2] };
}

export function statementDownloadFilename(
  landlordName: string,
  periodFrom: string,
  periodTo: string
): string {
  const safe =
    landlordName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "landlord";
  return `statement-${safe}-${periodFrom}-${periodTo}.pdf`;
}

export function contentDispositionAttachment(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]+/g, "_").replace(/"/g, "'");
  const encoded = encodeURIComponent(filename).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export function statementDownloadPath(statementId: string): string {
  return `/api/statements/${statementId}/download`;
}

export function renderLandlordStatementPdf(input: LandlordStatementPdfInput): Uint8Array {
  const agency =
    input.agencyName ?? siteContent.contact.address.line1 ?? "Property Management Services";
  const totals = input.totals ?? {};
  const lines = [
    agency,
    `${siteContent.contact.address.line2}, ${siteContent.contact.address.city} ${siteContent.contact.address.postcode}`,
    `Tel ${siteContent.contact.phone}  ·  ${siteContent.contact.email}`,
    "",
    `Landlord: ${input.landlordName || "—"}`,
    `Period: ${input.periodFrom} to ${input.periodTo}`,
    `Issued: ${formatIssuedAt(input.issuedAt)}`,
    "",
    "Summary",
    `Rent received: ${money(totals.rent)}`,
    `Management fees: ${money(totals.fees)}`,
    `Maintenance / costs: ${money(totals.costs)}`,
    ...worksPdfLines(totals.works),
    `Adjustments: ${money(totals.adjustments)}`,
    `Net due to landlord: ${money(totals.net)}`,
    `Ledger entries in period: ${Number(totals.count ?? 0)}`,
    "",
    "This statement is generated from the landlord ledger for the dates above.",
    "Positive net means an amount is owed to the landlord; negative means the landlord owes the agency.",
  ];
  return buildSimplePdf("Landlord statement", lines);
}
