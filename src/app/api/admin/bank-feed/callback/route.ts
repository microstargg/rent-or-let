import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { getDefaultBranch, updateBranchSettings } from "@/lib/db/queries";
import {
  getBankConnectionById,
  selectBankAccount,
  updateBankConnection,
} from "@/lib/db/queries/bank-feed";
import {
  exchangeTrueLayerCode,
  isTrueLayerConfigured,
  listTrueLayerAccounts,
} from "@/lib/truelayer/client";
import { getConnectionTokens } from "@/lib/db/queries/bank-feed";
import { getAppUrl } from "@/lib/app-url";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const appUrl = getAppUrl();

  if (oauthError) {
    return NextResponse.redirect(
      `${appUrl}/admin/settings?bank=error&reason=${encodeURIComponent(oauthError)}`
    );
  }

  const { error: authError } = await requireAdminApi();
  if (authError) {
    return NextResponse.redirect(`${appUrl}/sign-in?redirect=/admin/settings`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/admin/settings?bank=error&reason=missing_code`);
  }

  const connection = await getBankConnectionById(state);
  if (!connection) {
    return NextResponse.redirect(`${appUrl}/admin/settings?bank=error&reason=unknown_connection`);
  }

  const branch = await getDefaultBranch();
  if (!branch || branch.id !== connection.branchId) {
    return NextResponse.redirect(`${appUrl}/admin/settings?bank=error&reason=branch_mismatch`);
  }

  try {
    if (!isTrueLayerConfigured()) {
      return NextResponse.redirect(`${appUrl}/admin/settings?bank=error&reason=not_configured`);
    }

    const tokens = await exchangeTrueLayerCode(code);
    await updateBankConnection(connection.id, {
      status: "linked",
      tokens,
      consentExpiresAt: new Date(Date.now() + 90 * 86400000),
    });

    const refreshed = await getBankConnectionById(connection.id);
    const access = refreshed ? getConnectionTokens(refreshed).accessToken : null;
    if (!access) {
      return NextResponse.redirect(`${appUrl}/admin/settings?bank=error&reason=no_token`);
    }

    const accounts = await listTrueLayerAccounts(access);
    if (accounts.length === 1) {
      await selectBankAccount(connection.id, accounts[0]);
      await updateBranchSettings(connection.branchId, {
        bank_feed_connection_id: connection.id,
        bank_feed_enabled: true,
      });
      return NextResponse.redirect(`${appUrl}/admin/settings?bank=connected`);
    }

    await updateBankConnection(connection.id, {
      status: "select_account",
      meta: { accounts },
    });
    return NextResponse.redirect(
      `${appUrl}/admin/settings?bank=select_account&connection=${connection.id}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "callback_failed";
    return NextResponse.redirect(
      `${appUrl}/admin/settings?bank=error&reason=${encodeURIComponent(msg.slice(0, 120))}`
    );
  }
}
