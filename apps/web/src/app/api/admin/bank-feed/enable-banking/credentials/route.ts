import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { getDefaultBranch } from "@/lib/db/queries";
import { ensureAgency } from "@/lib/db/agency-scope";
import { EnableBankingError, listAspsps } from "@/lib/bank-feed/enable-banking";
import {
  configFromCredentials,
  removeEnableBankingCredentials,
  saveEnableBankingCredentials,
  validateCredentials,
} from "@/lib/bank-feed/enable-banking-credentials";
import { canEncryptSecrets } from "@/lib/bank-feed/secret-box";

/** POST multipart { appId, key: .pem file } — save the agency's own Enable Banking app. */
export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  await ensureAgency();
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });
  if (!canEncryptSecrets()) {
    return NextResponse.json(
      { error: "Bank feed storage isn't switched on for LetFlow yet. Contact LetFlow support." },
      { status: 503 }
    );
  }

  const form = await request.formData();
  const appId = String(form.get("appId") ?? "").trim().toLowerCase();
  const file = form.get("key");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Upload the .pem key file" }, { status: 400 });
  }
  if (file.size > 20_000) {
    return NextResponse.json({ error: "That file is too big to be an Enable Banking key" }, { status: 400 });
  }
  const pem = (await file.text()).trim();
  const invalid = validateCredentials(appId, pem);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  // Try a harmless call so a mismatched id and key are caught now, not at month end.
  let warning: string | null = null;
  try {
    await listAspsps(configFromCredentials(appId, pem));
  } catch (err) {
    if (err instanceof EnableBankingError && (err.status === 401 || err.status === 403)) {
      return NextResponse.json(
        {
          error:
            "Enable Banking didn't accept that ID and key together. Check the ID is the .pem file's name and that you uploaded the key for the same application.",
        },
        { status: 400 }
      );
    }
    warning = "Saved, but Enable Banking couldn't be reached to check it. Try connecting the bank from Month end.";
  }

  await saveEnableBankingCredentials(branch.id, appId, pem);
  return NextResponse.json({ ok: true, warning });
}

/** DELETE — forget the agency's app; bank links made with it stop syncing. */
export async function DELETE() {
  const { error } = await requireAdminApi();
  if (error) return error;
  await ensureAgency();
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });
  await removeEnableBankingCredentials(branch.id);
  return NextResponse.json({ ok: true });
}
