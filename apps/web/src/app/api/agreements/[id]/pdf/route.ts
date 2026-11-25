import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth/server";
import { getAgreementWithSignatures, getSignatureByToken } from "@/lib/db/queries/tenancy";
import { renderAgreementPdf, type AgreementTerms } from "@/lib/tenancy/agreement";
import { pdfResponse } from "@/lib/pdf/compliance-docs";

/** Staff, or a signer holding a link for this agreement (?token=), can download it. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token");
  let allowed = false;
  if (token) {
    const found = await getSignatureByToken(token);
    allowed = found?.agreement.id === id;
  } else {
    allowed = Boolean(await requireStaffSession());
  }
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getAgreementWithSignatures(id);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pdf = renderAgreementPdf(data.agreement.terms as AgreementTerms, {
    hash: data.agreement.termsHash,
    signatures: data.signatures,
  });
  return pdfResponse(pdf, "tenancy-agreement.pdf");
}
