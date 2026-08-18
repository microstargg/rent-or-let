import { notFound } from "next/navigation";
import { requireAdminApi } from "@/lib/api-auth";
import { getTenancyNoticeContext, listTenancyEvidence } from "@/lib/db/queries";
import { pdfResponse, renderEvidencePackPdf } from "@/lib/pdf/compliance-docs";
import { displayPersonName } from "@/lib/person-name";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const ctx = await getTenancyNoticeContext(id);
  if (!ctx) notFound();
  const evidence = await listTenancyEvidence(id);
  const lines = [
    ...evidence.notices.map((n) => ({
      title: n.type.replaceAll("_", " "),
      detail: `Served ${n.servedAt ? new Date(n.servedAt).toLocaleDateString("en-GB") : "—"} · effective ${n.effectiveAt ?? "—"}`,
    })),
    ...evidence.documents.map((d) => ({
      title: d.kind,
      detail: `Channel ${d.servedChannel ?? "—"} · ${d.servedAt ? new Date(d.servedAt).toLocaleDateString("en-GB") : "not served"}`,
    })),
  ];
  const pdf = renderEvidencePackPdf({
    propertyAddress: ctx.property.displayAddress,
    renterName: displayPersonName(ctx.renterFirstName, ctx.renterLastName),
    lines,
  });
  return pdfResponse(pdf, "tenancy-evidence-pack.pdf");
}
