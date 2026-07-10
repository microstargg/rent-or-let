import { getDefaultBranch, getBranchWithSettings } from "@/lib/db/queries";
import { AgencySettingsClient } from "@/components/admin/agency-settings-client";

export default async function AdminSettingsPage() {
  const branch = await getDefaultBranch();
  const full = branch ? await getBranchWithSettings(branch.id) : null;
  const inboundDomain = process.env.RESEND_INBOUND_DOMAIN ?? "";

  return (
    <div>
      <h1 className="text-3xl font-bold">Agency settings</h1>
      <p className="mt-1 text-muted-foreground">Stripe, maintenance inbox, alerts</p>

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
        />
      </div>
    </div>
  );
}
