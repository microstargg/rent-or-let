import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireLandlordSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { agencyEq, ensureAgency } from "@/lib/db/agency-scope";
import { complianceItems, documents, properties } from "@/lib/db/schema";

/** Opens a compliance certificate, only for the landlord who owns the property. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireLandlordSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await ensureAgency();
  const [row] = await db
    .select({ url: documents.url })
    .from(complianceItems)
    .innerJoin(documents, eq(complianceItems.documentId, documents.id))
    .innerJoin(properties, eq(complianceItems.propertyId, properties.id))
    .where(
      and(
        eq(documents.id, id),
        eq(properties.landlordId, session.profile.profile.landlordId),
        agencyEq(complianceItems.agencyId)
      )
    )
    .limit(1);
  if (!row || !row.url || row.url.startsWith("#")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.redirect(new URL(row.url, request.url));
}
