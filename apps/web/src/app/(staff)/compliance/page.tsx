import Link from "next/link";
import {
  getDefaultBranch,
  listComplianceItems,
  listAllProperties,
} from "@/lib/db/queries";
import { listBranchRequirements } from "@/lib/db/queries/compliance";
import { complianceLabel } from "@/lib/portal-format";
import { scoreRequirements } from "@/lib/compliance/requirements";
import { REGISTER_WINDOWS } from "@/lib/compliance/register";
import { ComplianceActions } from "@/components/admin/compliance-actions";
import { ComplianceCreateForm } from "@/components/admin/compliance-create-form";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  StatusBadge,
  StatPill,
} from "@/components/admin/admin-page";
import { formatDate } from "@/lib/utils";

export default async function AdminCompliancePage() {
  const branch = await getDefaultBranch();
  const items = branch ? await listComplianceItems(branch.id) : [];
  const requirementRows = branch ? await listBranchRequirements(branch.id) : [];
  const scores = requirementRows
    .map(({ property, requirements }) => ({
      propertyId: property.id,
      propertyAddress: property.displayAddress,
      ...scoreRequirements(requirements),
    }))
    .sort((a, b) => a.score - b.score);
  const gaps = requirementRows.flatMap(({ property, requirements }) =>
    requirements
      .filter((r) => r.required && !r.item)
      .map((r) => ({ ...r, propertyAddress: property.displayAddress }))
  );
  const properties = await listAllProperties();
  const atRisk = scores.filter((s) => s.score < 80 || s.expired > 0 || s.expiring > 0);
  const expiredCount = items.filter((i) => i.item.status === "expired").length;
  const expiringCount = items.filter((i) => i.item.status === "expiring").length;
  const letRegister = requirementRows
    .filter((r) => r.register.isLet)
    .map((r) => ({ property: r.property, register: r.register }))
    .sort((a, b) => (a.register.deadline ?? "9999").localeCompare(b.register.deadline ?? "9999"));
  const registeredCount = letRegister.filter((r) => r.register.propertyNumber).length;
  // One list for the "Missing" card and the "Not on file" section, so they agree:
  // records the law needs that aren't on file, plus items already marked missing.
  const notOnFile = [
    ...gaps.map((g) => ({
      key: `${g.propertyId}:${g.key}`,
      propertyId: g.propertyId,
      label: complianceLabel(g.type),
      propertyAddress: g.propertyAddress,
      reason: g.reason as string | null,
    })),
    ...items
      .filter((i) => i.item.status === "missing")
      .map((i) => ({
        key: i.item.id,
        propertyId: i.item.propertyId,
        label: complianceLabel(i.item.type),
        propertyAddress: i.propertyAddress,
        reason: null as string | null,
      })),
  ];
  const missingCount = notOnFile.length;

  const sortedItems = [...items].sort((a, b) => {
    const order = { expired: 0, expiring: 1, missing: 2, valid: 3 };
    return (
      (order[a.item.status as keyof typeof order] ?? 4) -
      (order[b.item.status as keyof typeof order] ?? 4)
    );
  });

  return (
    <div>
      <AdminPageHeader
        title="Compliance certificates"
        description="Track Gas Safety, EICR, EPC and tenancy documents. Refresh statuses to create chase tasks for anything expiring."
        actions={<ComplianceActions />}
      />

      <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatPill label="Properties tracked" value={scores.length} />
        <StatPill label="Expiring soon" value={expiringCount} tone={expiringCount ? "warning" : "success"} />
        <StatPill label="Expired" value={expiredCount} tone={expiredCount ? "danger" : "success"} />
        <StatPill label="Missing" value={missingCount} tone={missingCount ? "warning" : "neutral"} />
      </div>

      <AdminSection
        title="Property scores"
        description="Lowest scores first — aim to clear expired and missing items"
      >
        {atRisk.length || scores.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(atRisk.length ? atRisk : scores).slice(0, 12).map((s) => (
              <Link
                key={s.propertyId}
                href={`/properties/${s.propertyId}?tab=compliance`}
                className="block rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/50 hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-snug hover:underline">{s.propertyAddress}</p>
                  <span
                    className={
                      s.score >= 80
                        ? "text-lg font-bold text-emerald-700"
                        : s.score >= 50
                          ? "text-lg font-bold text-amber-700"
                          : "text-lg font-bold text-red-700"
                    }
                  >
                    {s.score}%
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {s.valid} valid · {s.expiring} expiring · {s.expired} expired · {s.missing} missing
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="No compliance scores yet"
            description="Add certificates below, or create a tenancy to seed the move-in checklist."
          />
        )}
      </AdminSection>

      <AdminSection
        title="Landlord register"
        description={`${registeredCount} of ${letRegister.length} let properties registered. Registration opens by region from 15 Dec 2026; every let property must be registered by 14 Nov 2027.`}
      >
        {letRegister.length ? (
          <ul className="divide-y rounded-xl border bg-card">
            {letRegister
              .filter((r) => !r.register.propertyNumber || r.register.status !== "valid")
              .slice(0, 50)
              .map(({ property, register }) => (
                <li key={property.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <Link href={`/properties/${property.id}`} className="font-medium hover:underline">
                      {property.displayAddress}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {register.region
                        ? `${REGISTER_WINDOWS[register.region].label}: opens ${formatDate(register.opens!)}, deadline ${formatDate(register.deadline!)}`
                        : "Region unknown: set it on the property"}
                      {register.propertyNumber ? ` · ${register.propertyNumber}` : " · not registered yet"}
                      {register.landlordRenewalDate ? ` · fee renews ${formatDate(register.landlordRenewalDate)}` : ""}
                    </p>
                  </div>
                  <StatusBadge
                    status={register.status === "not_due" ? "upcoming" : register.status}
                    tone={register.status === "not_due" ? "neutral" : undefined}
                  />
                </li>
              ))}
          </ul>
        ) : (
          <AdminEmptyState title="No let properties" />
        )}
      </AdminSection>

      <AdminSection
        title="Not on file"
        description="Records the law needs for these properties and tenancies that haven't been added yet"
      >
        {notOnFile.length ? (
          <ul className="divide-y rounded-xl border bg-card">
            {notOnFile.slice(0, 50).map((g) => (
              <li key={g.key} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <Link href={`/properties/${g.propertyId}?tab=compliance`} className="font-medium hover:underline">
                    {g.label}
                  </Link>
                  <p className="text-sm text-muted-foreground">{g.propertyAddress}</p>
                  {g.reason && <p className="text-xs text-muted-foreground">{g.reason}</p>}
                </div>
                <StatusBadge status="missing" />
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmptyState title="Nothing missing" description="Every property has the records it needs on file." />
        )}
        {notOnFile.length > 50 && (
          <p className="mt-2 text-xs text-muted-foreground">Showing 50 of {notOnFile.length}.</p>
        )}
      </AdminSection>

      <AdminSection title="Add certificate" description="Upload a file and set the expiry so reminders can fire">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <ComplianceCreateForm
            properties={properties.map((p) => ({
              id: p.id,
              label: p.displayAddress,
            }))}
          />
        </div>
      </AdminSection>

      <AdminSection title="All items" description="Sorted by urgency">
        {sortedItems.length ? (
          <div className="space-y-2">
            {sortedItems.map(({ item, propertyAddress, document }) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {complianceLabel(item.type)}
                    </p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{propertyAddress}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {item.expiresAt ? formatDate(item.expiresAt) : "—"}
                    {document?.servedAt
                      ? ` · Served via ${document.servedChannel ?? "unknown"}`
                      : " · Not served"}
                  </p>
                  {document?.url && document.url !== "#served-without-file" && (
                    <Link
                      href={document.url}
                      className="mt-1 inline-block text-xs text-primary underline"
                      target="_blank"
                    >
                      View document
                    </Link>
                  )}
                </div>
                <ComplianceActions itemId={item.id} />
              </div>
            ))}
          </div>
        ) : (
          <AdminEmptyState title="No compliance items" />
        )}
      </AdminSection>
    </div>
  );
}
