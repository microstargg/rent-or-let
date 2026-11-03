import { headers } from "next/headers";
import Link from "next/link";
import { getTenant } from "@repo/config/server";
import { getDefaultBranch } from "@/lib/db/queries";
import { ensureAgency } from "@/lib/db/agency-scope";
import { EnableBankingSetup } from "@/components/admin/enable-banking-setup";
import { getEnableBankingSetupStatus } from "@/lib/bank-feed/enable-banking-credentials";
import { canEncryptSecrets } from "@/lib/bank-feed/secret-box";
import { AdminEmptyState } from "@/components/admin/admin-page";

export default async function BankFeedSetupPage() {
  const slug = await ensureAgency();
  const branch = await getDefaultBranch();
  if (!branch) return <AdminEmptyState title="No branch" description="Set up a branch first." />;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const redirectUrl =
    process.env.ENABLE_BANKING_REDIRECT_URL?.trim() ||
    `${proto}://${host}/api/admin/bank-feed/enable-banking/callback`;
  const status = await getEnableBankingSetupStatus(slug, branch.id);

  return (
    <div>
      <p className="text-sm">
        <Link href="/settings" className="text-primary underline">
          Settings
        </Link>{" "}
        / Bank feed
      </p>
      <h1 className="mt-2 text-3xl font-bold">Set up your bank feed</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        Link your client account through open banking so Month end pulls transactions in by itself. Your
        agency sets this up in its own Enable Banking account, so the link stays yours.
      </p>
      <div className="mt-8 max-w-2xl">
        <EnableBankingSetup
          redirectUrl={redirectUrl}
          agencyName={getTenant().name}
          status={status}
          storageReady={canEncryptSecrets()}
        />
      </div>
    </div>
  );
}
