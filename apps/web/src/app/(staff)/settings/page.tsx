import { getDefaultBranch, getBranchWithSettings, listStaffInvites, listStaffProfiles } from "@/lib/db/queries";
import { AgencySettingsClient } from "@/components/admin/agency-settings-client";
import { StaffTeamClient } from "@/components/admin/staff-team-client";
import Link from "next/link";

export default async function AdminSettingsPage() {
  const branch = await getDefaultBranch();
  const full = branch ? await getBranchWithSettings(branch.id) : null;
  const inboundDomain = process.env.RESEND_INBOUND_DOMAIN ?? "";
  const [staff, invites] = await Promise.all([listStaffProfiles(), listStaffInvites()]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Agency settings</h1>
      <p className="mt-1 text-muted-foreground">
        Rent rails, client money details, Stripe, maintenance inbox
      </p>

      <div className="mt-8 max-w-xl space-y-6">
        <StaffTeamClient staff={staff} invites={invites} />
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="font-semibold">Bank feed</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pull client account transactions into Month end through open banking, instead of uploading statements.
          </p>
          <Link href="/settings/bank-feed" className="mt-2 inline-block text-sm text-primary underline">
            Set up bank feed
          </Link>
        </div>
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
          clientAccountName={full?.settings.client_account_name ?? null}
          clientAccountSortCode={full?.settings.client_account_sort_code ?? null}
          clientAccountNumber={full?.settings.client_account_number ?? null}
        />
      </div>
    </div>
  );
}
