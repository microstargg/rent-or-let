import { NextResponse } from "next/server";
import { insertComplaint, insertEnquiry } from "@/lib/db/queries";
import {
  createTicket,
  findBranchByMaintenanceToken,
  getRenterByEmail,
  getActiveTenancyForRenter,
} from "@/lib/db/queries";

interface ResendInboundEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

function extractMaintenanceToken(to: string): string | null {
  const match = to.match(/maintenance\+([^@]+)@/i);
  return match?.[1] ?? null;
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
    const senderEmail = (fromMatch?.[1] ?? fromMatch?.[2] ?? email.from).trim();
    const senderName = email.from.replace(/<.+>/, "").trim() || senderEmail;

    const maintenanceToken = extractMaintenanceToken(email.to);
    if (maintenanceToken) {
      const branch = await findBranchByMaintenanceToken(maintenanceToken);
      if (branch) {
        const renter = await getRenterByEmail(senderEmail, branch.id);
        const tenancy = renter
          ? await getActiveTenancyForRenter(renter.id, branch.id)
          : null;

        if (tenancy) {
          await createTicket({
            branchId: branch.id,
            propertyId: tenancy.propertyId,
            tenancyId: tenancy.id,
            reportedByType: "tenant",
            reportedById: renter?.id,
            source: "email",
            summary: email.subject || "Maintenance request",
            description: email.text ?? email.html ?? "",
          });
          return NextResponse.json({ success: true, routed: "ticket" });
        }
      }
      return NextResponse.json({ success: true, routed: "maintenance-unmatched" });
    }

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
