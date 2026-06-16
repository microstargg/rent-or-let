import { NextResponse } from "next/server";
import { insertComplaint, insertEnquiry } from "@/lib/db/queries";

interface ResendInboundEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get("svix-signature");
    if (!signature) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const payload = (await request.json()) as { data?: ResendInboundEmail };
    const email = payload.data;
    if (!email) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const fromMatch = email.from.match(/<(.+)>|(.+)/);
    const senderEmail = fromMatch?.[1] ?? fromMatch?.[2] ?? email.from;
    const senderName = email.from.replace(/<.+>/, "").trim() || senderEmail;

    const isComplaint =
      email.subject.toLowerCase().includes("complaint") ||
      email.to.toLowerCase().includes("complaints@");

    if (isComplaint) {
      const slaDue = new Date();
      slaDue.setDate(slaDue.getDate() + 5);

      await insertComplaint({
        tenantName: senderName,
        tenantEmail: senderEmail,
        subject: email.subject,
        description: email.text ?? email.html ?? "",
        source: "email",
        slaDueAt: slaDue,
      });
    } else {
      await insertEnquiry({
        name: senderName,
        email: senderEmail,
        message: email.text ?? email.html ?? email.subject,
        source: "email",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Inbound email error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
