import { buildStyledPdf, type PdfBlock } from "./simple-pdf";
import { siteContent } from "@/lib/content/site";

export interface LandlordStatementWorkLine {
  dated: string;
  address: string;
  summary: string;
  amount: number;
}

export interface LandlordStatementPropertyTotals {
  id: string | null;
  address: string;
  rent: number;
  fees: number;
  costs: number;
  adjustments: number;
  net: number;
  works: LandlordStatementWorkLine[];
}

export interface LandlordStatementTotals {
  rent?: number;
  fees?: number;
  costs?: number;
  adjustments?: number;
  net?: number;
  count?: number;
  works?: LandlordStatementWorkLine[];
  properties?: LandlordStatementPropertyTotals[];
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

function row(
  label: string,
  value: number | undefined,
  opts?: { bold?: boolean; indent?: boolean; abs?: boolean }
): PdfBlock {
  const n = Number(value ?? 0);
  return {
    kind: "row",
    label,
    value: money(opts?.abs ? Math.abs(n) : n),
    bold: opts?.bold,
    indent: opts?.indent,
  };
}

export function renderLandlordStatementPdf(input: LandlordStatementPdfInput): Uint8Array {
  const agency =
    input.agencyName ?? siteContent.contact.address.line1 ?? "Property Management Services";
  const totals = input.totals ?? {};
  const properties = totals.properties ?? [];
  const blocks: PdfBlock[] = [
    { kind: "title", text: "Landlord statement" },
    { kind: "text", text: agency, bold: true },
    {
      kind: "text",
      text: `${siteContent.contact.address.line2}, ${siteContent.contact.address.city} ${siteContent.contact.address.postcode}`,
    },
    { kind: "text", text: `Tel ${siteContent.contact.phone}  ·  ${siteContent.contact.email}` },
    { kind: "rule" },
    { kind: "text", text: input.landlordName || "—", bold: true },
    { kind: "text", text: `Period ${input.periodFrom} to ${input.periodTo}` },
    { kind: "text", text: `Issued ${formatIssuedAt(input.issuedAt)}` },
    { kind: "spacer" },
    { kind: "heading", text: "Portfolio summary" },
    row("Rent received", totals.rent),
    row("Management fees", totals.fees),
    row("Maintenance / costs", totals.costs),
    row("Adjustments", totals.adjustments),
    { kind: "rule" },
    row("Net due to landlord", totals.net, { bold: true }),
  ];

  for (const property of properties) {
    blocks.push({ kind: "spacer" });
    blocks.push({ kind: "heading", text: property.address || "Property" });
    blocks.push(row("Rent received", property.rent));
    blocks.push(row("Management fee", property.fees));
    if (property.works.length) {
      blocks.push({ kind: "text", text: "Works", bold: true });
      for (const work of property.works) {
        blocks.push(
          row(`${work.dated}  ${work.summary}`, work.amount, { indent: true, abs: true })
        );
      }
    }
    if (property.adjustments) blocks.push(row("Adjustments", property.adjustments));
    blocks.push({ kind: "rule" });
    blocks.push(row("Property net", property.net, { bold: true }));
  }

  if (!properties.length && totals.works?.length) {
    blocks.push({ kind: "spacer" });
    blocks.push({ kind: "heading", text: "Works" });
    for (const work of totals.works) {
      const label = [work.dated, work.address, work.summary].filter(Boolean).join("  ");
      blocks.push(row(label, work.amount, { abs: true }));
    }
  }

  blocks.push({ kind: "spacer" });
  blocks.push({ kind: "rule" });
  blocks.push(row("Total net due to landlord", totals.net, { bold: true }));
  blocks.push({ kind: "spacer" });
  blocks.push({
    kind: "text",
    text: "This statement is generated from the landlord ledger for the dates above.",
  });
  blocks.push({
    kind: "text",
    text: "Positive net is owed to the landlord; negative means the landlord owes the agency.",
  });

  return buildStyledPdf(blocks);
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
