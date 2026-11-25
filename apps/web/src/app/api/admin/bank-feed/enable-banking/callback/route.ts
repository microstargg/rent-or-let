import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth/server";
import { getDefaultBranch } from "@/lib/db/queries";
import { ensureAgency } from "@/lib/db/agency-scope";
import {
  EB_STATE_COOKIE,
  createSession,
} from "@/lib/bank-feed/enable-banking";
import { resolveEnableBankingConfig } from "@/lib/bank-feed/enable-banking-credentials";
import {
  saveEnableBankingSession,
  syncEnableBankingForBranch,
} from "@/lib/bank-feed/enable-banking-sync";

export const maxDuration = 60;

/** The bank sends the user back here with ?code=…&state=… (or ?error=…). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (params: Record<string, string>) => {
    const target = new URL("/finance/month-end", url.origin);
    for (const [k, v] of Object.entries(params)) target.searchParams.set(k, v);
    return NextResponse.redirect(target);
  };

  const session = await requireStaffSession();
  if (!session) return NextResponse.redirect(new URL("/login", url.origin));

  const slug = await ensureAgency();
  const branch = await getDefaultBranch();
  if (!branch) return back({ bank_error: "No branch" });
  const config = await resolveEnableBankingConfig(slug, branch.id);
  if (!config) return back({ bank_error: "Open banking is not set up" });

  const jar = await cookies();
  const expectedState = jar.get(EB_STATE_COOKIE)?.value;
  jar.delete({ name: EB_STATE_COOKIE, path: "/api/admin/bank-feed/enable-banking" });

  const bankError = url.searchParams.get("error");
  if (bankError) {
    const detail = url.searchParams.get("error_description") || bankError;
    return back({ bank_error: `The bank did not share access: ${detail}`.slice(0, 200) });
  }
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) return back({ bank_error: "No authorisation code came back from the bank" });
  if (!expectedState || state !== expectedState) {
    return back({ bank_error: "That link has expired. Start connecting the bank again." });
  }

  try {
    const ebSession = await createSession(config, code);
    const saved = await saveEnableBankingSession(branch.id, ebSession);
    const result = await syncEnableBankingForBranch(config, branch.id, {
      connectionIds: saved.map((c) => c.id),
    });
    return back({
      bank: "connected",
      accounts: String(saved.length),
      imported: String(result.imported),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not finish connecting the bank";
    return back({ bank_error: message.slice(0, 200) });
  }
}
