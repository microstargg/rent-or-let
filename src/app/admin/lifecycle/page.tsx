import Link from "next/link";
import {
  getDefaultBranch,
  listDepositRegister,
  listInspections,
  listNotices,
  listTenancies,
} from "@/lib/db/queries";
import { LifecycleActions } from "@/components/admin/lifecycle-actions";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  AdminTable,
  StatusBadge,
  StatPill,
} from "@/components/admin/admin-page";
import { displayPersonName } from "@/lib/person-name";
import { formatDate } from "@/lib/utils";

export default async function AdminLifecyclePage() {
  const branch = await getDefaultBranch();
  const deposits = branch ? await listDepositRegister(branch.id) : [];
  const inspections = branch ? await listInspections(branch.id) : [];
  const notices = branch ? await listNotices(branch.id) : [];
  const tenancyRows = branch ? await listTenancies(branch.id) : [];

  const unprotected = deposits.filter((d) => !d.tenancy.depositProtectionRef).length;
  const openInspections = inspections.filter((i) => !i.inspection.completedAt).length;

  return (
    <div>
      <AdminPageHeader
        title="Deposits, inspections & notices"
        description="Protect deposits, run inspections, and keep RRA / Section 13 evidence on file."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatPill
          label="Unprotected deposits"
          value={unprotected}
          tone={unprotected ? "danger" : "success"}
          hint="Active tenancies without a scheme reference"
        />
        <StatPill
          label="Open inspections"
          value={openInspections}
          tone={openInspections ? "warning" : "neutral"}
        />
        <StatPill label="Notices on file" value={notices.length} />
      </div>

      <LifecycleActions
        tenancies={tenancyRows.map(({ tenancy, propertyAddress, renterFirstName, renterLastName }) => ({
          id: tenancy.id,
          propertyId: tenancy.propertyId,
          label: `${propertyAddress} — ${displayPersonName(renterFirstName, renterLastName)}`,
        }))}
      />

      <AdminSection title="Deposit register" description="Active tenancies and protection status">
        {deposits.length ? (
          <AdminTable headers={["Property", "Renter", "Deposit", "Scheme", "Status"]}>
            {deposits.map(({ tenancy, propertyAddress, renterFirstName, renterLastName }) => {
              const protected_ = Boolean(tenancy.depositProtectionRef);
              return (
                <tr key={tenancy.id}>
                  <td className="px-4 py-3 font-medium">{propertyAddress}</td>
                  <td className="px-4 py-3">
                    {displayPersonName(renterFirstName, renterLastName)}
                  </td>
                  <td className="px-4 py-3">
                    £{Number(tenancy.depositAmount ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {tenancy.depositScheme ?? "—"}
                    {tenancy.depositProtectionRef ? ` · ${tenancy.depositProtectionRef}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={protected_ ? "protected" : "unprotected"}
                      tone={protected_ ? "success" : "danger"}
                    />
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        ) : (
          <AdminEmptyState title="No active tenancies" />
        )}
      </AdminSection>

      <AdminSection title="Inspections">
        {inspections.length ? (
          <div className="space-y-2">
            {inspections.map(({ inspection, propertyAddress }) => (
              <div
                key={inspection.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm"
              >
                <div>
                  <Link
                    href={`/admin/inspections/${inspection.id}`}
                    className="font-semibold capitalize text-primary"
                  >
                    {inspection.type.replaceAll("_", " ")}
                  </Link>
                  <p className="text-sm text-muted-foreground">{propertyAddress}</p>
                  {inspection.summary && (
                    <p className="mt-1 text-sm">{inspection.summary}</p>
                  )}
                </div>
                <StatusBadge
                  status={inspection.completedAt ? "completed" : "open"}
                  tone={inspection.completedAt ? "success" : "warning"}
                />
              </div>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="No inspections yet"
            description="Create a move-in inspection from the actions above."
          />
        )}
      </AdminSection>

      <AdminSection title="Notices">
        {notices.length ? (
          <AdminTable headers={["Type", "Property", "Served", "Effective", "Download"]}>
            {notices.map(({ notice, propertyAddress }) => (
              <tr key={notice.id}>
                <td className="px-4 py-3 capitalize font-medium">
                  {notice.type.replaceAll("_", " ")}
                </td>
                <td className="px-4 py-3">{propertyAddress}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {notice.servedAt ? formatDate(notice.servedAt) : "—"}
                </td>
                <td className="px-4 py-3">
                  <a
                    className="text-primary underline"
                    href={`/api/admin/notices/${notice.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    PDF
                  </a>
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <AdminEmptyState title="No notices on file" />
        )}
      </AdminSection>
    </div>
  );
}
