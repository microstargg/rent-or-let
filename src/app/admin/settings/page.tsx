import { getDefaultBranch, getBranchWithSettings, listBankConnections } from "@/lib/db/queries";
import { AgencySettingsClient } from "@/components/admin/agency-settings-client";
import { isTrueLayerConfigured } from "@/lib/truelayer/client";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const branch = await getDefaultBranch();
  const full = branch ? await getBranchWithSettings(branch.id) : null;
  const inboundDomain = process.env.RESEND_INBOUND_DOMAIN ?? "";
  const connections = branch ? await listBankConnections(branch.id) : [];
  const params = searchParams ? await searchParams : {};
  const bankSelect =
    typeof params.connection === "string"
      ? params.connection
      : connections.find((c) => c.status === "select_account")?.id ?? null;

  return (
    <div>
      <h1 className="text-3xl font-bold">Agency settings</h1>
      <p className="mt-1 text-muted-foreground">
        Rent rails, client money bank feed, Stripe, maintenance inbox
      </p>

      <div className="mt-8 max-w-xl">
        <AgencySettingsClient
          maintenanceInbox={
            full?.settings.maintenance_inbox_token && inboundDomain
              ? `maintenance+${full.settings.maintenance_inbox_token}@${inboundDomain}`
              : null
          }
          inboundDomain={inboundDomain}
          stripeOnboardingComplete={full?.settings.stripe_onboarding_complete ?? false}
          stripeAccountId={full?.settings.stripe_account_id ?? null}
          alertEmail={full?.settings.alert_email ?? null}
          truelayerConfigured={isTrueLayerConfigured()}
          bankSelectConnectionId={bankSelect}
          bankConnections={connections.map((c) => ({
            id: c.id,
            status: c.status,
            accountName: c.accountName,
            accountNumberMask: c.accountNumberMask,
            consentExpiresAt: c.consentExpiresAt,
            lastSyncedAt: c.lastSyncedAt,
            meta: (c.meta ?? {}) as {
              accounts?: Array<{
                account_id: string;
                display_name?: string;
                account_type?: string;
              }>;
            },
          }))}
        />
      </div>
    </div>
  );
}
