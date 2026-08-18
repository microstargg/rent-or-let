import { buildStyledPdf, type PdfBlock } from "./simple-pdf";
import { siteContent } from "@/lib/content/site";
import { parseInspectionReport } from "@/lib/inspections/report";
import { contentDispositionAttachment } from "./landlord-statement";

export { contentDispositionAttachment };

function typeLabel(type: string): string {
  return type.replaceAll("_", " ");
}

export function renderInspectionPdf(input: {
  type: string;
  propertyAddress: string;
  scheduledAt?: Date | string | null;
  completedAt?: Date | string | null;
  summary?: string | null;
  notes?: string | null;
  meta: unknown;
  compare?: { type: string; completedAt?: Date | string | null; meta: unknown } | null;
}): Uint8Array {
  const report = parseInspectionReport(input.meta);
  const compareReport = input.compare ? parseInspectionReport(input.compare.meta) : null;
  const blocks: PdfBlock[] = [
    { kind: "title", text: `${typeLabel(input.type)} inspection` },
    { kind: "text", text: siteContent.contact.address.line1, bold: true },
    { kind: "text", text: input.propertyAddress, bold: true },
    {
      kind: "text",
      text: `Scheduled ${formatWhen(input.scheduledAt)}  ·  Completed ${formatWhen(input.completedAt)}`,
    },
    { kind: "rule" },
  ];
  if (input.summary) {
    blocks.push({ kind: "heading", text: "Summary" });
    blocks.push({ kind: "text", text: input.summary });
  }
  if (input.notes) {
    blocks.push({ kind: "text", text: `Notes: ${input.notes}` });
  }

  blocks.push({ kind: "heading", text: "Meters" });
  for (const meter of report.meters) {
    const prev = compareReport?.meters.find((m) => m.type === meter.type);
    const value = prev?.reading
      ? `${meter.reading || "—"} (was ${prev.reading})`
      : meter.reading || "—";
    blocks.push({ kind: "row", label: meter.type, value });
  }

  for (const room of report.rooms) {
    blocks.push({ kind: "heading", text: room.name });
    if (room.notes) blocks.push({ kind: "text", text: room.notes });
    const prevRoom = compareReport?.rooms.find((r) => r.name === room.name);
    for (const el of room.elements) {
      const prev = prevRoom?.elements.find((e) => e.name === el.name);
      const value = prev
        ? `${el.condition} (was ${prev.condition})`
        : el.condition;
      blocks.push({
        kind: "row",
        label: el.notes ? `${el.name} — ${el.notes}` : el.name,
        value,
      });
    }
  }

  if (input.compare) {
    blocks.push({ kind: "rule" });
    blocks.push({
      kind: "text",
      text: `Compared with ${typeLabel(input.compare.type)} (${formatWhen(input.compare.completedAt)})`,
    });
  }

  return buildStyledPdf(blocks);
}

export function renderNoticePdf(input: {
  type: string;
  propertyAddress: string;
  renterName: string;
  servedAt?: Date | string | null;
  effectiveAt?: string | null;
  grounds?: string | null;
  currentRent?: string | number | null;
  proposedRent?: string | number | null;
}): Uint8Array {
  const blocks: PdfBlock[] = [
    { kind: "title", text: noticeTitle(input.type) },
    { kind: "text", text: siteContent.contact.address.line1, bold: true },
    {
      kind: "text",
      text: `${siteContent.contact.address.line2}, ${siteContent.contact.address.city} ${siteContent.contact.address.postcode}`,
    },
    { kind: "rule" },
    { kind: "row", label: "Property", value: input.propertyAddress },
    { kind: "row", label: "Tenant", value: input.renterName },
    { kind: "row", label: "Served", value: formatWhen(input.servedAt) },
  ];
  if (input.effectiveAt) {
    blocks.push({ kind: "row", label: "Effective", value: input.effectiveAt });
  }
  if (input.currentRent != null) {
    blocks.push({ kind: "row", label: "Current rent", value: money(input.currentRent) });
  }
  if (input.proposedRent != null) {
    blocks.push({ kind: "row", label: "Proposed rent", value: money(input.proposedRent) });
  }
  if (input.grounds) {
    blocks.push({ kind: "heading", text: "Details" });
    blocks.push({ kind: "text", text: input.grounds });
  }
  blocks.push({ kind: "spacer" });
  blocks.push({
    kind: "text",
    text: "This record is evidence that the notice was generated and served via the agency platform. It is not a substitute for prescribed statutory form wording where a specific form is required.",
  });
  return buildStyledPdf(blocks);
}

export function renderPetDecisionPdf(input: {
  propertyAddress: string;
  renterName: string;
  petDescription: string;
  status: string;
  decidedAt?: Date | string | null;
  notes?: string | null;
}): Uint8Array {
  return buildStyledPdf([
    { kind: "title", text: "Pet request decision" },
    { kind: "text", text: siteContent.contact.address.line1, bold: true },
    { kind: "rule" },
    { kind: "row", label: "Property", value: input.propertyAddress },
    { kind: "row", label: "Tenant", value: input.renterName },
    { kind: "row", label: "Pet", value: input.petDescription },
    { kind: "row", label: "Decision", value: input.status },
    { kind: "row", label: "Date", value: formatWhen(input.decidedAt) },
    ...(input.notes
      ? ([{ kind: "heading", text: "Notes" }, { kind: "text", text: input.notes }] as PdfBlock[])
      : []),
    {
      kind: "text",
      text: "Written decision under the implied pet-consent term in the Housing Act 1988 s.16A (Renters’ Rights Act 2025).",
    },
  ]);
}

export function renderEvidencePackPdf(input: {
  propertyAddress: string;
  renterName: string;
  lines: { title: string; detail: string }[];
}): Uint8Array {
  const blocks: PdfBlock[] = [
    { kind: "title", text: "Tenancy evidence pack" },
    { kind: "text", text: siteContent.contact.address.line1, bold: true },
    { kind: "row", label: "Property", value: input.propertyAddress },
    { kind: "row", label: "Tenant", value: input.renterName },
    { kind: "rule" },
  ];
  for (const line of input.lines) {
    blocks.push({ kind: "heading", text: line.title });
    blocks.push({ kind: "text", text: line.detail });
  }
  if (!input.lines.length) {
    blocks.push({ kind: "text", text: "No served documents recorded yet." });
  }
  return buildStyledPdf(blocks);
}

function noticeTitle(type: string): string {
  if (type === "section_13") return "Rent increase notice (Section 13)";
  if (type === "rra_info_sheet") return "Renters’ Rights Act information";
  return typeLabel(type);
}

function formatWhen(value?: Date | string | null): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB");
}

function money(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `£${n.toFixed(2)}`;
}

export function pdfResponse(bytes: Uint8Array, filename: string): Response {
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDispositionAttachment(filename),
      "Cache-Control": "private, no-store",
    },
  });
}
