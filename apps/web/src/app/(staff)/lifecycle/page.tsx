import Link from "next/link";
import { getDefaultBranch, listDepositRegister, listNotices } from "@/lib/db/queries";
import { DepositRowActions } from "@/components/admin/deposit-row-actions";
import { BulkRraButton } from "@/components/admin/bulk-rra-button";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  AdminTable,
  StatGrid,
  StatusBadge,
  StatPill,
} from "@/components/admin/admin-page";
import { displayPersonName } from "@/lib/person-name";
import { formatDay, formatMoney, humanize } from "@/lib/utils";

export default async function AdminLifecyclePage() {
  const branch = await getDefaultBranch();
  const [deposits, notices] = branch
    ? await Promise.all([listDepositRegister(branch.id), listNotices(branch.id)])
    : [[], []];

  const unprotected = deposits.filter((d) => !d.tenancy.depositProtectionRef);
  // Unprotected deposits first: they have a 30-day legal deadline.
  const sorted = [...deposits].sort(
    (a, b) => Number(Boolean(a.tenancy.depositProtectionRef)) - Number(Boolean(b.tenancy.depositProtectionRef))
  );

  return (
    <div>
      <AdminPageHeader
        title="Deposits & notices"
        description="Protect deposits, serve rent increase notices, and keep evidence on file. Inspections are on the Inspections page."
        actions={
          <>
            <BulkRraButton />
            <Link href="/inspections" className="text-sm text-primary hover:underline">
              Inspections
            </Link>
          </>
        }
      />

      <StatGrid columns={3}>
        <StatPill
          label="Unprotected deposits"
          value={unprotected.length}
          tone={unprotected.length ? "danger" : "success"}
          hint="Live tenancies with no scheme reference"
        />
        <StatPill label="Deposits held" value={formatMoney(deposits.reduce((s, d) => s + Number(d.tenancy.depositAmount ?? 0), 0), { pence: false })} />
        <StatPill label="Notices on file" value={notices.length} />
      </StatGrid>

      <AdminSection title="Deposit register" description="Each row has its own actions, so they always apply to that tenancy.">
        {sorted.length ? (
          <AdminTable headers={["Property", "Renter", "Deposit", "Scheme", ""]}>
            {sorted.map(({ tenancy, propertyAddress, renterFirstName, renterLastName }) => {
              const isProtected = Boolean(tenancy.depositProtectionRef);
              return (
                <tr key={tenancy.id} className="row-link align-top">
                  <td className="px-4 py-3">
                    <Link href={`/tenancies/${tenancy.id}?tab=deposit`} className="row-link-main">
                      {propertyAddress}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{displayPersonName(renterFirstName, renterLastName)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(Number(tenancy.depositAmount ?? 0))}</td>
                  <td className="px-4 py-3">
                    {isProtected ? (
                      <span className="text-muted-foreground">
                        {tenancy.depositScheme ?? "Protected"} · {tenancy.depositProtectionRef}
                      </span>
                    ) : (
                      <StatusBadge status="unprotected" tone="danger" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <DepositRowActions
                      tenancyId={tenancy.id}
                      isProtected={isProtected}
                      currentRent={Number(tenancy.rentAmount) || null}
                    />
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        ) : (
          <AdminEmptyState title="No live tenancies" />
        )}
      </AdminSection>

      <AdminSection title="Notices">
        {notices.length ? (
          <AdminTable headers={["Type", "Property", "Served", ""]}>
            {notices.map(({ notice, propertyAddress }) => (
              <tr key={notice.id}>
                <td className="px-4 py-3 font-medium">{humanize(notice.type)}</td>
                <td className="px-4 py-3">{propertyAddress}</td>
                <td className="px-4 py-3 text-muted-foreground">{notice.servedAt ? formatDay(notice.servedAt) : "Not served"}</td>
                <td className="px-4 py-3 text-right">
                  <a className="text-primary hover:underline" href={`/api/admin/notices/${notice.id}/pdf`} target="_blank" rel="noreferrer">
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
