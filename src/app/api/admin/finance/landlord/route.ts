import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import {
  getDefaultBranch,
  generateLandlordStatements,
  createLandlordPayout,
  postLandlordAdjustment,
  listLandlordBalances,
} from "@/lib/db/queries";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });
  const balances = await listLandlordBalances(branch.id);
  return NextResponse.json(balances);
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });

  const body = (await request.json()) as {
    action?: string;
    from?: string;
    to?: string;
    landlord_id?: string;
    amount?: number;
    memo?: string;
    statement_id?: string;
  };

  if (body.action === "generate_statements" && body.from && body.to) {
    const rows = await generateLandlordStatements(branch.id, body.from, body.to);
    return NextResponse.json({ created: rows.length, rows });
  }

  if (body.action === "email_statement" && body.statement_id) {
    const { emailLandlordStatement } = await import(
      "@/lib/operations/finance/email-statement"
    );
    const result = await emailLandlordStatement({
      branchId: branch.id,
      statementId: body.statement_id,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }

  if (body.action === "payout" && body.landlord_id) {
    const payout = await createLandlordPayout({
      branchId: branch.id,
      landlordId: body.landlord_id,
      amount: body.amount,
    });
    return NextResponse.json(payout);
  }

  if (body.action === "adjustment" && body.landlord_id && body.amount != null) {
    const row = await postLandlordAdjustment({
      branchId: branch.id,
      landlordId: body.landlord_id,
      amount: body.amount,
      memo: body.memo,
    });
    return NextResponse.json(row);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
