import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { getDefaultBranch } from "@/lib/db/queries";
import { ensureAgency } from "@/lib/db/agency-scope";
import {
  EB_STATE_COOKIE,
  EnableBankingError,
  enableBankingRedirectUrl,
  getEnableBankingConfig,
  listAspsps,
  listBanksForPicker,
  startAuthorisation,
} from "@/lib/bank-feed/enable-banking";
import {
  disconnectEnableBanking,
  syncEnableBankingForBranch,
} from "@/lib/bank-feed/enable-banking-sync";

// A first sync pulls 90 days and runs matching.
export const maxDuration = 60;

function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Enable Banking request failed";
  const status = err instanceof EnableBankingError && err.status < 500 ? 400 : 502;
  return NextResponse.json({ error: message }, { status });
}

/** GET — list banks the customer can pick from. */
export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const config = getEnableBankingConfig(await ensureAgency());
  if (!config) return NextResponse.json({ error: "Open banking is not set up" }, { status: 404 });
  try {
    const banks = await listBanksForPicker(config);
    return NextResponse.json({
      country: config.country,
      banks: banks
        .map((b) => ({ name: b.name, country: b.country, logo: b.logo ?? null, beta: Boolean(b.beta) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * POST { action: "connect", bank }       — start bank consent, returns { url } to send the user to
 * POST { action: "sync" }                — pull new transactions and match them
 * POST { action: "disconnect", id }      — revoke consent for that account's session
 */
export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const config = getEnableBankingConfig(await ensureAgency());
  if (!config) return NextResponse.json({ error: "Open banking is not set up" }, { status: 404 });
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    bank?: string;
    country?: string;
    id?: string;
  };

  try {
    if (body.action === "connect") {
      const bank = body.bank?.trim();
      if (!bank) return NextResponse.json({ error: "Pick a bank" }, { status: 400 });
      const country = (body.country?.trim() || config.country).toUpperCase();
      // Respect the bank's own consent limit and account types, or /auth is refused.
      const aspsp = (await listAspsps(config, country)).find((b) => b.name === bank);
      if (!aspsp) return NextResponse.json({ error: `${bank} is not available` }, { status: 400 });
      const psuTypes = aspsp.psu_types ?? [];
      const psuType =
        psuTypes.length && !psuTypes.includes(config.psuType)
          ? (psuTypes[0] as "business" | "personal")
          : config.psuType;
      const state = randomBytes(16).toString("hex");
      const auth = await startAuthorisation(
        { ...config, psuType },
        {
          bank,
          country,
          redirectUrl: enableBankingRedirectUrl(request),
          state,
          validForSeconds: aspsp.maximum_consent_validity,
        }
      );
      const jar = await cookies();
      jar.set(EB_STATE_COOKIE, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/admin/bank-feed/enable-banking",
        maxAge: 30 * 60,
      });
      return NextResponse.json({ url: auth.url });
    }

    if (body.action === "sync") {
      const result = await syncEnableBankingForBranch(config, branch.id);
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "disconnect") {
      if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
      const count = await disconnectEnableBanking(config, branch.id, body.id);
      if (count == null) return NextResponse.json({ error: "Connection not found" }, { status: 404 });
      return NextResponse.json({ ok: true, disconnected: count });
    }
  } catch (err) {
    return errorResponse(err);
  }

  return NextResponse.json({ error: "Unknown action. Use connect, sync or disconnect." }, { status: 400 });
}
