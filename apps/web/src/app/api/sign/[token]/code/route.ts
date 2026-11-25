import { NextResponse } from "next/server";
import { getTenant } from "@repo/config/server";
import { issueSigningCode } from "@/lib/db/queries/agreement-signing";
import { maskEmail, SIGNING_CODE } from "@/lib/tenancy/agreement";
import { sendEmail } from "@/lib/email/send";
import { inDemoAgency } from "@/lib/demo/server";
import { requestInfo } from "@/lib/request-info";

/** Email the signer a one-time code. They type it in to prove the email is theirs. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const issued = await issueSigningCode(token, requestInfo(request));
  if ("error" in issued) return NextResponse.json({ error: issued.error }, { status: issued.status });

  // The demo sends no email, so show the code on screen there and only there.
  if (inDemoAgency()) {
    return NextResponse.json({ sentTo: maskEmail(issued.email), demoCode: issued.code });
  }

  const agency = getTenant().name;
  const sent = await sendEmail({
    to: issued.email,
    subject: `${issued.code} is your code to sign your tenancy agreement`,
    text: `Hi ${issued.fullName},\n\nYour code to sign the tenancy agreement from ${agency} is:\n\n${issued.code}\n\nIt works for ${SIGNING_CODE.ttlMinutes} minutes. If you didn't ask for it, ignore this email and tell ${agency}.\n\n${agency}`,
  });
  if (!sent.ok) {
    return NextResponse.json({ error: "We couldn't send the code. Please contact your letting agent." }, { status: 502 });
  }
  return NextResponse.json({ sentTo: maskEmail(issued.email) });
}
