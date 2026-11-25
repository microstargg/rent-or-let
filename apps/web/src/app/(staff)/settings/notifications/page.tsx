import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaffSession } from "@/lib/auth/server";
import { getBranchWithSettings, getDefaultBranch, getStaffProfileById } from "@/lib/db/queries";
import { getStaffNotificationPrefs } from "@/lib/db/queries/notifications";
import { isOutboundEmailConfigured } from "@/lib/email/send";
import { inDemoAgency } from "@/lib/demo/server";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { NotificationSettingsClient } from "@/components/admin/notification-settings-client";

export default async function NotificationSettingsPage() {
  const session = await requireStaffSession();
  if (!session) redirect("/login");
  const branch = await getDefaultBranch();
  const [prefs, profile, full] = await Promise.all([
    getStaffNotificationPrefs(session.user.id),
    getStaffProfileById(session.user.id),
    branch ? getBranchWithSettings(branch.id) : Promise.resolve(null),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="Notifications"
        description="The bell shows jobs assigned to you, tasks due, emergency repairs, new applications and certificate alerts. Choose which emails you also get."
      />
      <p className="mt-4 text-sm">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground">
          ← Agency settings
        </Link>
      </p>
      <div className="mt-6 max-w-xl">
        <NotificationSettingsClient
          email={profile?.email ?? session.user.email}
          digest={prefs.digest}
          instantEmail={prefs.instantEmail}
          isAdmin={profile?.role === "admin"}
          complianceAlerts={full?.settings.compliance_alerts === "everyone" ? "everyone" : "admins"}
          emailNote={
            inDemoAgency()
              ? "Emails are switched off on the demo. Use the preview to see what would be sent."
              : isOutboundEmailConfigured()
                ? null
                : "Email sending is not set up yet (RESEND_API_KEY), so nothing will be sent until it is."
          }
        />
      </div>
    </div>
  );
}
