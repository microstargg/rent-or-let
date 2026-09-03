import { notFound } from "next/navigation";
import { requireAdminApi } from "@/lib/api-auth";
import { getInspectionById, listInspections } from "@/lib/db/queries";
import { pdfResponse, renderInspectionPdf } from "@/lib/pdf/compliance-docs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const row = await getInspectionById(id);
  if (!row) notFound();

  let compare: { type: string; completedAt?: Date | string | null; meta: unknown } | null = null;
  if (row.inspection.tenancyId && row.inspection.type !== "move_in") {
    const all = await listInspections(row.inspection.branchId);
    const moveIn = all.find(
      (i) =>
        i.inspection.tenancyId === row.inspection.tenancyId &&
        i.inspection.type === "move_in" &&
        i.inspection.completedAt
    );
    if (moveIn) {
      compare = {
        type: moveIn.inspection.type,
        completedAt: moveIn.inspection.completedAt,
        meta: moveIn.inspection.meta,
      };
    }
  }

  const pdf = renderInspectionPdf({
    type: row.inspection.type,
    propertyAddress: row.property.displayAddress,
    scheduledAt: row.inspection.scheduledAt,
    completedAt: row.inspection.completedAt,
    summary: row.inspection.summary,
    notes: row.inspection.notes,
    meta: row.inspection.meta,
    compare,
  });
  return pdfResponse(pdf, `inspection-${row.inspection.type}.pdf`);
}
