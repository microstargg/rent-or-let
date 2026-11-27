import Link from "next/link";
import { getDefaultBranch, getBranchWithSettings, getStaffProfileById, listStaffInvites, listStaffProfiles } from "@/lib/db/queries";
import { requireStaffSession } from "@/lib/auth/server";
import { AgencySettingsClient } from "@/components/admin/agency-settings-client";
import { StaffTeamClient } from "@/components/admin/staff-team-client";
import { RegulatorySettingsClient } from "@/components/admin/regulatory-settings-client";
import { MoneySettingsClient } from "@/components/admin/money-settings-client";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { getLateFeeRules, getManagementFeePercent } from "@/lib/branch-settings";
import { isSmsConfigured } from "@/lib/sms/send";
import { cn } from "@/lib/utils";
import { isOpenBankingEnabled } from "@/lib/bank-feed/enable-banking";

const SECTIONS = [
  { id: "agency", label: "Agency" },
  { id: "team", label: "Team" },
  { id: "money", label: "Money & rent" },
  { id: "notifications", label: "Notifications" },
  { id: "compliance", label: "Compliance" },
  { id: "connections", label: "Connections" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function LinkCard({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href} className="block rounded-xl border p-4 transition-colors hover:bg-muted/40">
      <p className="font-medium">{title}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
    </Link>
  );
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section: raw } = await searchParams;
  const section: SectionId = SECTIONS.some((s) => s.id === raw) ? (raw as SectionId) : "agency";

  const [branch, session] = await Promise.all([getDefaultBranch(), requireStaffSession()]);
  const full = branch ? await getBranchWithSettings(branch.id) : null;
  const inboundDomain = process.env.RESEND_INBOUND_DOMAIN ?? "";
  const [staff, invites, me] = await Promise.all([
    listStaffProfiles(),
    listStaffInvites(),
    session?.user?.id ? getStaffProfileById(session.user.id) : null,
  ]);

  const agencyProps = {
    maintenanceInbox:
      full?.settings.maintenance_inbox_token && inboundDomain
        ? `maintenance+${full.settings.maintenance_inbox_token}@${inboundDomain}`
        : null,
    inboundDomain,
    stripeOnboardingComplete: full?.settings.stripe_onboarding_complete ?? false,
    stripeAccountId: full?.settings.stripe_account_id ?? null,
    alertEmail: full?.settings.alert_email ?? null,
    clientAccountName: full?.settings.client_account_name ?? null,
    clientAccountSortCode: full?.settings.client_account_sort_code ?? null,
    clientAccountNumber: full?.settings.client_account_number ?? null,
  };

  return (
    <div>
      <AdminPageHeader title="Settings" description="How your agency is set up on Let Flow." />

      <div className="mt-6 grid gap-6 md:grid-cols-[12rem_1fr]">
        <nav aria-label="Settings sections" className="-mx-1 flex gap-1 overflow-x-auto md:mx-0 md:flex-col">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`/settings?section=${s.id}`}
              aria-current={section === s.id ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-2 text-sm",
                section === s.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="max-w-2xl space-y-6">
          {section === "agency" && (
            <section className="rounded-xl border p-4">
              <h2 className="font-semibold">Agency details</h2>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
                <dt className="text-muted-foreground">Branch</dt>
                <dd>{full?.name ?? "—"}</dd>
                <dt className="text-muted-foreground">Address</dt>
                <dd>{full?.address || "—"}</dd>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{full?.phone || "—"}</dd>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">Ask Let Flow support to change these.</p>
            </section>
          )}

          {section === "team" && (
            <StaffTeamClient
              staff={staff}
              invites={invites}
              currentUserId={session?.user?.id ?? null}
              canManage={me?.role === "admin"}
            />
          )}

          {section === "money" && (
            <>
              <AgencySettingsClient {...agencyProps} only={["payments"]} />
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
            </>
          )}

          {section === "notifications" && (
            <>
              <LinkCard
                href="/settings/notifications"
                title="Your emails and alerts"
                text="Your morning email, instant emails, and who gets certificate alerts."
              />
              <AgencySettingsClient {...agencyProps} only={["alert"]} />
            </>
          )}

          {section === "compliance" && (
            <RegulatorySettingsClient
              redressScheme={full?.settings.redress_scheme ?? null}
              redressMemberNumber={full?.settings.redress_member_number ?? null}
              requirePrsNumber={full?.settings.require_prs_number ?? false}
              landlordComplianceEmails={full?.settings.landlord_compliance_emails ?? false}
            />
          )}

          {section === "connections" && (
            <>
              {isOpenBankingEnabled() && (
                <LinkCard
                  href="/settings/bank-feed"
                  title="Bank feed"
                  text="Pull client account transactions into Month end through open banking, instead of uploading statements."
                />
              )}
              <LinkCard href="/portals" title="Property portals" text="Send your listings to Rightmove and OnTheMarket." />
              <AgencySettingsClient {...agencyProps} only={["inbox", "stripe"]} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
