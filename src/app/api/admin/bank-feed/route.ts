import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { getDefaultBranch, updateBranchSettings } from "@/lib/db/queries";
import {
  getBankConnectionById,
  selectBankAccount,
  listBankConnections,
} from "@/lib/db/queries/bank-feed";
import { syncBankFeedForBranch } from "@/lib/bank-feed/sync";
import type { TrueLayerAccount } from "@/lib/truelayer/client";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });

  const connections = await listBankConnections(branch.id);
  return NextResponse.json({
    connections: connections.map((c) => ({
      id: c.id,
      status: c.status,
      accountName: c.accountName,
      accountNumberMask: c.accountNumberMask,
      sortCodeMask: c.sortCodeMask,
      consentExpiresAt: c.consentExpiresAt,
      lastSyncedAt: c.lastSyncedAt,
      meta: c.meta,
    })),
  });
}

const selectSchema = z.object({
  connectionId: z.string().uuid(),
  accountId: z.string().min(1),
});

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "select_account") {
    const body = selectSchema.parse(await request.json());
    const connection = await getBankConnectionById(body.connectionId);
    if (!connection || connection.branchId !== branch.id) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }
    const accounts = ((connection.meta as { accounts?: TrueLayerAccount[] })?.accounts ??
      []) as TrueLayerAccount[];
    const account = accounts.find((a) => a.account_id === body.accountId);
    if (!account) {
      return NextResponse.json({ error: "Account not in connection" }, { status: 400 });
    }
    await selectBankAccount(connection.id, account);
    await updateBranchSettings(branch.id, {
      bank_feed_connection_id: connection.id,
      bank_feed_enabled: true,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "sync") {
    const result = await syncBankFeedForBranch(branch.id);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
