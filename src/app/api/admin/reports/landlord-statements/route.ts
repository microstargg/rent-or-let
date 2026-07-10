import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { getDefaultBranch, getLandlordStatementData } from "@/lib/db/queries";

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const branch = await getDefaultBranch();
  if (!branch) {
    return NextResponse.json({ error: "No branch configured" }, { status: 400 });
  }

  const url = new URL(request.url);
  const from =
    url.searchParams.get("from") ??
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const to = url.searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

  const rows = await getLandlordStatementData(branch.id, from, to);
  const lines = [
    ["Landlord", "Payments", "Total GBP"].map(csvEscape).join(","),
    ...rows.map((v) => [v.name, String(v.paymentCount), v.total.toFixed(2)].map(csvEscape).join(",")),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="landlord-statements-${from}-${to}.csv"`,
    },
  });
}
