import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api-auth";
import {
  getDefaultBranch,
  refreshComplianceStatuses,
  listOverdueInspections,
  listOverduePetRequests,
  getBranchWithSettings,
} from "@/lib/db/queries";
import { sendPlainEmail } from "@/lib/email/send";

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });
  const result = await refreshComplianceStatuses(branch.id);
  const overdueInspections = await listOverdueInspections(branch.id);
  const overduePets = await listOverduePetRequests(branch.id);

  const full = await getBranchWithSettings(branch.id);
  const alert = full?.settings.alert_email;
  if (alert && (overdueInspections.length || overduePets.length)) {
    await sendPlainEmail({
      to: alert,
      subject: `Compliance follow-ups: ${overduePets.length} pet request(s), ${overdueInspections.length} inspection(s)`,
      text: [
        overduePets.length
          ? `Overdue pet requests:\n${overduePets
              .map((p) => `- ${p.propertyAddress} due ${p.request.dueAt.toISOString().slice(0, 10)}`)
              .join("\n")}`
          : "",
        overdueInspections.length
          ? `Overdue inspections:\n${overdueInspections
              .map((i) => `- ${i.propertyAddress} (${i.inspection.type})`)
              .join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
  }

  return NextResponse.json({
    ok: true,
    ...result,
    overdueInspections: overdueInspections.length,
    overduePets: overduePets.length,
  });
}
