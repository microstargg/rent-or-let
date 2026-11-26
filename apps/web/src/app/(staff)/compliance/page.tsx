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
  AdminTable,
  StatGrid,
  StatusBadge,
  StatPill,
} from "@/components/admin/admin-page";
import { formatDay } from "@/lib/utils";
import { AdminEntityDialog } from "@/components/admin/admin-entity-dialog";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { listBaseHref } from "@/components/admin/admin-pagination";

const SERVED_TYPES = new Set(["gas_safety", "epc", "eicr", "deposit_pi", "rra_info_sheet", "written_terms"]);

const SHOW = [
  { value: "action", label: "Needs action" },
  { value: "expired", label: "Expired" },
  { value: "expiring", label: "Expiring" },
  { value: "missing", label: "Missing" },
  { value: "valid", label: "Valid" },
] as const;

export default async function AdminCompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const show = SHOW.some((o) => o.value === sp.status) || sp.status === "all" ? sp.status! : "action";
  const typeFilter = sp.type ?? "";
  const q = (sp.q ?? "").trim().toLowerCase();
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
      type: g.type as string,
      label: complianceLabel(g.type),
      propertyAddress: g.propertyAddress,
      reason: g.reason as string | null,
    })),
    ...items
      .filter((i) => i.item.status === "missing")
      .map((i) => ({
        key: i.item.id,
        propertyId: i.item.propertyId,
        type: i.item.type,
        label: complianceLabel(i.item.type),
        propertyAddress: i.propertyAddress,
        reason: null as string | null,
      })),
  ];
  const missingCount = notOnFile.length;

  type Row = {
    key: string;
    propertyId: string;
    propertyAddress: string | null;
    type: string;
    label: string;
    status: string;
    expiresAt: string | null;
    servedAt: Date | string | null;
    documentUrl: string | null;
    itemId: string | null;
    reason: string | null;
  };
  const order: Record<string, number> = { expired: 0, expiring: 1, missing: 2, valid: 3 };
  const allRows: Row[] = [
    ...items
      .filter((i) => i.item.status !== "missing")
      .map(({ item, propertyAddress, document }) => ({
        key: item.id,
        propertyId: item.propertyId,
        propertyAddress,
        type: item.type,
        label: complianceLabel(item.type),
        status: item.status,
        expiresAt: item.expiresAt ? String(item.expiresAt) : null,
        servedAt: document?.servedAt ?? null,
        documentUrl: document?.url && document.url !== "#served-without-file" ? document.url : null,
        itemId: item.id,
        reason: null,
      })),
    ...notOnFile.map((g) => {
      return {
        key: g.key,
        propertyId: g.propertyId,
        propertyAddress: g.propertyAddress,
        type: g.type,
        label: g.label,
        status: "missing",
        expiresAt: null,
        servedAt: null,
        documentUrl: null,
        itemId: null,
        reason: g.reason,
      };
    }),
  ].sort(
    (a, b) =>
      (order[a.status] ?? 4) - (order[b.status] ?? 4) ||
      (a.expiresAt ?? "9999").localeCompare(b.expiresAt ?? "9999")
  );
  const types = Array.from(new Set(allRows.map((r) => r.type).filter(Boolean))).sort((a, b) =>
    complianceLabel(a).localeCompare(complianceLabel(b))
  );
  const rows = allRows.filter((r) => {
    if (show === "action" && r.status === "valid") return false;
    if (show !== "action" && show !== "all" && r.status !== show) return false;
    if (typeFilter && r.type !== typeFilter) return false;
    if (q && !`${r.propertyAddress ?? ""} ${r.label}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const shown = rows.slice(0, 100);
  const filterHref = (status: string) => listBaseHref("/compliance", { status, type: typeFilter, q: sp.q });

  const today = new Date().toISOString().slice(0, 10);
  const nextWindow = letRegister
    .map((r) => r.register.region)
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => REGISTER_WINDOWS[r])
    .filter((w) => w.deadline >= today)
    .sort((a, b) => a.opens.localeCompare(b.opens))[0];
  const registerSummary = [
    `${registeredCount} of ${letRegister.length} registered`,
    nextWindow
      ? nextWindow.opens > today
        ? `${nextWindow.label} opens ${formatDay(nextWindow.opens)}`
        : `${nextWindow.label} deadline ${formatDay(nextWindow.deadline)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <AdminPageHeader
        title="Compliance certificates"
        description="Gas safety, EICR, EPC and tenancy documents. Refresh statuses to add chase tasks for anything running out."
        actions={
          <>
            <ComplianceActions />
            <AdminEntityDialog triggerLabel="Add certificate" title="Add certificate" description="Upload the file and set the expiry so reminders go out.">
              <ComplianceCreateForm properties={properties.map((p) => ({ id: p.id, label: p.displayAddress }))} />
            </AdminEntityDialog>
          </>
        }
      />

      <StatGrid>
        <StatPill
          label="Needs action"
          value={expiredCount + expiringCount + missingCount}
          tone={expiredCount + expiringCount + missingCount ? "warning" : "success"}
          href={filterHref("action")}
          active={show === "action"}
        />
        <StatPill
          label="Expired"
          value={expiredCount}
          tone={expiredCount ? "danger" : "success"}
          href={filterHref("expired")}
          active={show === "expired"}
        />
        <StatPill
          label="Expiring soon"
          value={expiringCount}
          tone={expiringCount ? "warning" : "success"}
          href={filterHref("expiring")}
          active={show === "expiring"}
        />
        <StatPill
          label="Missing"
          value={missingCount}
          tone={missingCount ? "warning" : "neutral"}
          href={filterHref("missing")}
          active={show === "missing"}
        />
      </StatGrid>

      <AdminSection title={SHOW.find((o) => o.value === show)?.label ?? "All records"}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <AdminListToolbar searchPlaceholder="Search address or record" statusOptions={[...SHOW]} defaultStatus="action" />
          </div>
          <form method="get" className="flex items-center gap-2">
            {show !== "action" && <input type="hidden" name="status" value={show} />}
            {sp.q && <input type="hidden" name="q" value={sp.q} />}
            <label htmlFor="type" className="sr-only">
              Type
            </label>
            <select id="type" name="type" defaultValue={typeFilter} className="h-9 rounded-md border bg-background px-2 text-sm">
              <option value="">Any type</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {complianceLabel(t)}
                </option>
              ))}
            </select>
            <button type="submit" className="h-9 rounded-md border px-3 text-sm hover:bg-muted">
              Show
            </button>
          </form>
        </div>
        {shown.length ? (
          <div className="mt-3">
            <AdminTable headers={["Record", "Property", "Expires", "Status", ""]}>
              {shown.map((r) => (
                <tr key={r.key} className="row-link align-top">
                  <td className="px-4 py-3">
                    <Link href={`/properties/${r.propertyId}?tab=compliance`} className="row-link-main">
                      {r.label}
                    </Link>
                    {r.reason && <p className="text-xs text-muted-foreground">{r.reason}</p>}
                    {r.documentUrl && (
                      <a href={r.documentUrl} target="_blank" rel="noreferrer" className="mt-0.5 block text-xs text-primary hover:underline">
                        View document
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.propertyAddress ?? "—"}</td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 ${r.status === "expired" ? "text-red-700" : r.status === "expiring" ? "text-amber-700" : "text-muted-foreground"}`}
                  >
                    {r.expiresAt ? formatDay(r.expiresAt) : ""}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {r.itemId && SERVED_TYPES.has(r.type) ? (
                      r.servedAt ? (
                        <span className="text-xs text-muted-foreground">Served {formatDay(r.servedAt)}</span>
                      ) : (
                        <ComplianceActions itemId={r.itemId} />
                      )
                    ) : null}
                  </td>
                </tr>
              ))}
            </AdminTable>
            {rows.length > shown.length && (
              <p className="mt-2 text-xs text-muted-foreground">
                Showing {shown.length} of {rows.length}. Search or pick a type to narrow it down.
              </p>
            )}
          </div>
        ) : (
          <AdminEmptyState
            title={show === "action" ? "Nothing needs action" : "Nothing matches"}
            description={show === "action" ? "Every record is on file and in date." : "Try another filter."}
          />
        )}
      </AdminSection>

      <details className="mt-6 rounded-xl border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm">
          <span className="font-medium">Landlord register</span>
          <span className="text-muted-foreground"> · {registerSummary}</span>
        </summary>
        <div className="border-t">
          <p className="px-4 pt-3 text-xs text-muted-foreground">
            Registration opens by region from 15 Dec 2026. Every let property must be registered by 14 Nov 2027.
          </p>
          {letRegister.length ? (
            <ul className="divide-y">
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
                          ? `${REGISTER_WINDOWS[register.region].label}: opens ${formatDay(register.opens!)}, deadline ${formatDay(register.deadline!)}`
                          : "Region unknown: set it on the property"}
                        {register.propertyNumber ? ` · ${register.propertyNumber}` : " · not registered yet"}
                        {register.landlordRenewalDate ? ` · fee renews ${formatDay(register.landlordRenewalDate)}` : ""}
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
            <p className="px-4 py-3 text-sm text-muted-foreground">No let properties.</p>
          )}
        </div>
      </details>

      <AdminSection title="Property scores" description="Lowest first">
        {scores.length ? (
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
          <AdminEmptyState title="No scores yet" description="Add certificates, or create a tenancy to start the move-in checklist." />
        )}
      </AdminSection>
    </div>
  );
}
