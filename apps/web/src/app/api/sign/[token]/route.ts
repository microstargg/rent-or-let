import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenant } from "@repo/config/server";
import { parseJsonBody } from "@/lib/api-validation";
import { signAgreement } from "@/lib/db/queries/agreement-signing";
import { logAgreementEvent } from "@/lib/db/queries/agreement-events";
import { sendEmail } from "@/lib/email/send";
import { requestInfo } from "@/lib/request-info";

const schema = z.object({
  signed_name: z.string().trim().min(2).max(120),
  agree: z.literal(true),
  code: z.string().trim().max(12).optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsed = await parseJsonBody(request, schema);
  if (parsed.error) return parsed.error;
  const result = await signAgreement(token, {
    signedName: parsed.data.signed_name,
    code: parsed.data.code,
    ...requestInfo(request),
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  if (!result.completed) return NextResponse.json({ completed: false });

  // Everyone gets the signed copy, with the audit trail, as a PDF attachment.
  const agency = getTenant().name;
  const emailed: string[] = [];
  for (const r of result.recipients) {
    const sent = await sendEmail({
      to: r.email,
      subject: "Your signed tenancy agreement",
      text: `Hi ${r.name},\n\nEveryone has now signed the tenancy agreement. Your copy is attached, with a record of who signed and when.\n\nKeep it somewhere safe. Its fingerprint is ${result.pdfSha256.slice(0, 16)}, so ${agency} can always prove which version was signed.\n\n${agency}`,
      attachments: [{ filename: "tenancy-agreement.pdf", content: result.pdf }],
    });
    if (sent.ok) {
      emailed.push(r.email);
      await logAgreementEvent({ agreementId: result.agreementId, signatureId: r.signatureId, event: "copy_emailed" });
    }
  }
  return NextResponse.json({ completed: true, emailed: emailed.length });
}
