import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { notices, tenancies, properties, renters } from "@/lib/db/schema";
import { pdfResponse, renderNoticePdf } from "@/lib/pdf/compliance-docs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const [row] = await db
    .select({
      notice: notices,
      propertyAddress: properties.displayAddress,
      rentAmount: tenancies.rentAmount,
      renterFirstName: renters.firstName,
      renterLastName: renters.lastName,
    })
    .from(notices)
    .innerJoin(tenancies, eq(notices.tenancyId, tenancies.id))
    .innerJoin(properties, eq(tenancies.propertyId, properties.id))
    .innerJoin(renters, eq(tenancies.primaryRenterId, renters.id))
    .where(eq(notices.id, id))
    .limit(1);
  if (!row) notFound();
  const meta = (row.notice.meta ?? {}) as { proposedRent?: string | number };
  const pdf = renderNoticePdf({
    type: row.notice.type,
    propertyAddress: row.propertyAddress,
    renterName: `${row.renterFirstName} ${row.renterLastName}`.trim(),
    servedAt: row.notice.servedAt,
    effectiveAt: row.notice.effectiveAt,
    grounds: row.notice.grounds,
    currentRent: row.rentAmount,
    proposedRent: meta.proposedRent,
  });
  return pdfResponse(pdf, `${row.notice.type}.pdf`);
}
