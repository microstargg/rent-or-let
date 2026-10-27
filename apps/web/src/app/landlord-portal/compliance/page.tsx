import { requireLandlordSession } from "@/lib/auth/server";
import { listComplianceItems, listPropertiesForLandlord } from "@/lib/db/queries";
import { computeComplianceStatus } from "@/lib/db/queries/compliance";
import { AdminEmptyState, AdminPageHeader, StatPill, StatusBadge } from "@/components/admin/admin-page";
import { formatDate } from "@/lib/utils";
import { complianceLabel } from "@/lib/portal-format";

const STATUS_ORDER = { expired: 0, missing: 1, expiring: 2, valid: 3 } as const;

export default async function LandlordPortalCompliance() {
  const ctx = await requireLandlordSession();
  if (!ctx) return null;

  const props = await listPropertiesForLandlord(ctx.profile.profile.landlordId);
  const propIds = new Set(props.map((p) => p.id));
  const items = await listComplianceItems(ctx.profile.profile.branchId);
  const mine = items
    .filter((i) => propIds.has(i.item.propertyId))
    .map((i) => ({
      ...i,
      status: computeComplianceStatus(i.item.expiresAt, Boolean(i.item.documentId)),
    }))
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        (a.item.expiresAt ?? "").localeCompare(b.item.expiresAt ?? "")
    );

  const count = (s: keyof typeof STATUS_ORDER) => mine.filter((i) => i.status === s).length;
  const expired = count("expired") + count("missing");
  const expiring = count("expiring");

  return (
    <div>
      <AdminPageHeader
        title="Compliance"
        description="Safety certificates and legal checks for your properties. Your agent renews these for you."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatPill label="Up to date" value={count("valid")} tone="success" />
        <StatPill label="Expiring in 30 days" value={expiring} tone={expiring ? "warning" : "neutral"} />
        <StatPill label="Expired or missing" value={expired} tone={expired ? "danger" : "neutral"} />
      </div>

      <div className="mt-8">
        {mine.length ? (
          <ul className="divide-y rounded-xl border bg-card">
            {mine.map(({ item, propertyAddress, status }) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{complianceLabel(item.type)}</p>
                  <p className="text-sm text-muted-foreground">
                    {propertyAddress} ·{" "}
                    {item.expiresAt ? `expires ${formatDate(item.expiresAt)}` : "no expiry date"}
                  </p>
                </div>
                <StatusBadge status={status} />
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmptyState
            title="No compliance items yet"
            description="Certificates such as gas safety and EPC will appear here once your agent adds them."
          />
        )}
      </div>
    </div>
  );
}
