import { notFound } from "next/navigation";
import { getTenant } from "@repo/config/server";
import { requireAdminApi } from "@/lib/api-auth";
import { getTenancyDetail } from "@/lib/db/queries/tenancy";
import { getTenancyLedger } from "@/lib/db/queries/portfolio";
import { buildStyledPdf, type PdfBlock } from "@/lib/pdf/simple-pdf";
import { pdfResponse } from "@/lib/pdf/compliance-docs";
import { displayPersonName } from "@/lib/person-name";
import { formatDay, formatMoney } from "@/lib/utils";

/** The PDF font has no real minus sign, so use a hyphen. */
const money = (n: number) => formatMoney(n).replace("−", "-");

/** Rent account for one tenancy as a PDF: every charge and payment with a running balance. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const detail = await getTenancyDetail(id);
  if (!detail) notFound();
  const lines = await getTenancyLedger(id);
  const { name: agencyName } = getTenant();
  const tenants = [detail.renter, ...detail.jointTenants.map((j) => j.renter)]
    .map((r) => displayPersonName(r.firstName, r.lastName))
    .join(", ");
  const closing = lines.at(-1)?.balance ?? 0;

  const blocks: PdfBlock[] = [
    { kind: "title", text: "Rent account" },
    { kind: "text", text: agencyName, bold: true },
    { kind: "text", text: detail.property.displayAddress, bold: true },
    { kind: "text", text: `Tenants: ${tenants}` },
    { kind: "text", text: `Printed ${formatDay(new Date())}` },
    { kind: "rule" },
  ];
  for (const line of lines) {
    const amount = line.charge ? `+${money(line.charge)}` : `-${money(line.paid)}`;
    blocks.push({
      kind: "row",
      label: `${formatDay(line.dueDate ?? line.date)}  ${line.description}`,
      value: `${amount}   balance ${money(line.balance)}`,
    });
  }
  if (!lines.length) blocks.push({ kind: "text", text: "Nothing charged or paid yet." });
  blocks.push({ kind: "rule" });
  blocks.push({
    kind: "row",
    label: closing > 0.004 ? "Owed by the tenant" : closing < -0.004 ? "In credit" : "Balance",
    value: money(Math.abs(closing)),
    bold: true,
  });

  const slug = detail.property.displayAddress.split(",")[0]?.replace(/[^\w]+/g, "-").toLowerCase() ?? "tenancy";
  return pdfResponse(buildStyledPdf(blocks), `rent-account-${slug}.pdf`);
}
