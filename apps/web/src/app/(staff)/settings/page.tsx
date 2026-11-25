import Link from "next/link";
import { getDefaultBranch, getBranchWithSettings, listStaffInvites, listStaffProfiles } from "@/lib/db/queries";
import { AgencySettingsClient } from "@/components/admin/agency-settings-client";
import { StaffTeamClient } from "@/components/admin/staff-team-client";
import { RegulatorySettingsClient } from "@/components/admin/regulatory-settings-client";
import { MoneySettingsClient } from "@/components/admin/money-settings-client";
import { getLateFeeRules, getManagementFeePercent } from "@/lib/branch-settings";
import { isSmsConfigured } from "@/lib/sms/send";

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
        <Link
          href="/settings/notifications"
          className="block rounded-xl border p-4 transition-colors hover:bg-muted/40"
        >
          <p className="font-medium">Notifications and emails</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Your morning email, instant emails, and who gets certificate alerts.
          </p>
        </Link>
        <StaffTeamClient staff={staff} invites={invites} />
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
        {full && (
          <MoneySettingsClient
            feePercent={getManagementFeePercent(full.settings)}
            vatRegistered={full.settings.vat_registered ?? false}
            vatRate={full.settings.vat_rate ?? 20}
            lateInterest={(() => {
              const r = getLateFeeRules(full.settings);
              return { enabled: r.enabled !== false, baseRate: r.base_rate ?? null, margin: r.margin ?? 3 };
            })()}
            arrearsReminders={{
              enabled: full.settings.arrears_reminders?.enabled ?? false,
              sms: full.settings.arrears_reminders?.sms ?? false,
            }}
            smsConfigured={isSmsConfigured()}
          />
        )}
        <RegulatorySettingsClient
          redressScheme={full?.settings.redress_scheme ?? null}
          redressMemberNumber={full?.settings.redress_member_number ?? null}
          requirePrsNumber={full?.settings.require_prs_number ?? false}
        />
      </div>
    </div>
  );
}
