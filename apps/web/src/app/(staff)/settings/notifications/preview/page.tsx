import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaffSession } from "@/lib/auth/server";
import { getDefaultBranch } from "@/lib/db/queries";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-page";
import { buildDigest, loadDigestContext, renderDigest } from "@/lib/notifications/digest";

/** Shows the signed-in person exactly what tomorrow's morning email would contain. */
export default async function DigestPreviewPage() {
  const session = await requireStaffSession();
  if (!session) redirect("/login");
  const branch = await getDefaultBranch();
  const ctx = branch ? await loadDigestContext(branch.id) : null;
  const person = ctx?.staff.find((s) => s.id === session.user.id) ?? null;
  const digest = ctx && person ? buildDigest(ctx, person) : null;
  const rendered = digest ? renderDigest(digest, person!.id) : null;

  return (
    <div>
      <AdminPageHeader
        title="Morning email preview"
        description={digest ? `Subject: ${digest.subject}` : "What your morning email would contain right now."}
      />
      <p className="mt-4 text-sm">
        <Link href="/settings/notifications" className="text-muted-foreground hover:text-foreground">
          ← Notification settings
        </Link>
      </p>
      <div className="mt-6">
        {rendered ? (
          <iframe
            title="Morning email preview"
            srcDoc={rendered.html}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            className="h-[80vh] w-full rounded-xl border bg-white"
          />
        ) : (
          <AdminEmptyState
            title="Nothing to send today"
            description="You have no jobs or tasks due, and no alerts. On a day like this the morning email is skipped."
          />
        )}
      </div>
    </div>
  );
}
