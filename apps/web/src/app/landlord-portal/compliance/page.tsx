import { requireLandlordSession } from "@/lib/auth/server";
import { getLandlordCompliance } from "@/lib/compliance/landlord-view";
import { AdminEmptyState, AdminPageHeader, AdminSection, StatPill, StatusBadge } from "@/components/admin/admin-page";
import { formatDate } from "@/lib/utils";
import { complianceLabel } from "@/lib/portal-format";
import { warningDays } from "@/lib/compliance/requirements";

const STATUS_TEXT: Record<string, string> = {
  valid: "Up to date",
  expiring: "Expiring soon",
  expired: "Expired",
  missing: "Not on file",
};

export default async function LandlordPortalCompliance() {
  const ctx = await requireLandlordSession();
  if (!ctx) return null;

  const { landlordId, branchId } = ctx.profile.profile;
  const { properties, actions, counts } = await getLandlordCompliance(landlordId, branchId);
  const needsAttention = counts.expired + counts.missing;

  return (
    <div>
      <AdminPageHeader
        title="Compliance"
        description="Everything the law needs for your properties, what's on file, and when it runs out."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatPill label="Up to date" value={counts.valid} tone="success" />
        <StatPill label="Expiring soon" value={counts.expiring} tone={counts.expiring ? "warning" : "neutral"} />
        <StatPill
          label="Expired or not on file"
          value={needsAttention}
          tone={needsAttention ? "danger" : "neutral"}
        />
      </div>

      {actions.length > 0 && (
        <AdminSection title="Your actions" description="Things only you can do. Your agent handles everything else.">
          <ul className="divide-y rounded-xl border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20">
            {actions.map((a) => (
              <li key={a.key} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.propertyAddress ? `${a.propertyAddress} · ` : ""}
                    {a.dueDate ? `due ${formatDate(a.dueDate)} · ` : ""}
                    {a.detail}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </AdminSection>
      )}

      {properties.length ? (
        properties.map((p) => (
          <AdminSection key={p.id} title={p.address}>
            <ul className="divide-y rounded-xl border bg-card">
              {p.requirements.map((r) => (
                <li key={r.key} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{complianceLabel(r.type)}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.item?.expiresAt
                        ? `${r.status === "expired" ? "Expired" : "Expires"} ${formatDate(r.item.expiresAt)}`
                        : r.item
                          ? "No expiry date"
                          : "Not on file yet"}
                      {" · "}
                      {r.responsible === "landlord" ? "You arrange this" : "Your agent arranges this"}
                      {r.item?.documentId ? (
                        <>
                          {" · "}
                          <a
                            href={`/api/landlord-portal/documents/${r.item.documentId}`}
                            className="text-primary hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            View certificate
                          </a>
                        </>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.reason}
                      {r.status === "expiring" && r.item?.expiresAt
                        ? ` We flag this ${warningDays(r.type)} days before it runs out.`
                        : ""}
                    </p>
                  </div>
                  <span title={STATUS_TEXT[r.status]}>
                    <StatusBadge status={r.status} />
                  </span>
                </li>
              ))}
            </ul>
          </AdminSection>
        ))
      ) : (
        <div className="mt-8">
          <AdminEmptyState
            title="No properties linked yet"
            description="Once your agent links your properties, their certificates and checks appear here."
          />
        </div>
      )}
    </div>
  );
}
