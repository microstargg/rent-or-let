import { notFound } from "next/navigation";
import { requireAdminApi } from "@/lib/api-auth";
import { getPetRequestById } from "@/lib/db/queries";
import { pdfResponse, renderPetDecisionPdf } from "@/lib/pdf/compliance-docs";
import { displayPersonName } from "@/lib/person-name";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const row = await getPetRequestById(id);
  if (!row) notFound();
  const pdf = renderPetDecisionPdf({
    propertyAddress: row.property.displayAddress,
    renterName: displayPersonName(row.renterFirstName ?? "", row.renterLastName ?? ""),
    petDescription: row.request.petDescription,
    status: row.request.status,
    decidedAt: row.request.decisionAt,
    notes: row.request.decisionNotes,
  });
  return pdfResponse(pdf, `pet-request-${row.request.status}.pdf`);
}
