import Link from "next/link";
import { Suspense } from "react";
import {
  searchTenancies,
  listAllProperties,
  listRenters,
  getDefaultBranch,
  listArrears,
  ADMIN_LIST_PAGE_SIZE,
} from "@/lib/db/queries";
import { TenancyForm } from "@/components/admin/tenancy-form";
import { AdminEntityDialog } from "@/components/admin/admin-entity-dialog";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination, listBaseHref } from "@/components/admin/admin-pagination";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  AdminTable,
  StatusBadge,
  StatPill,
} from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { displayPersonName } from "@/lib/person-name";
import { formatCurrency, formatDay, formatMoney } from "@/lib/utils";
import { getPaymentRefFromMetadata } from "@/lib/payment-ref";
import { CopyPaymentRef } from "@/components/admin/copy-payment-ref";

export default async function AdminTenanciesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  // Default to active when status omitted; "all" shows everything
  const statusParam = params.status;
  const status =
    statusParam === "all" ? "all" : statusParam === "ended" ? "ended" : "active";
  const page = Math.max(1, Number(params.page) || 1);
  const filter = params.filter === "arrears" || params.filter === "ending" ? params.filter : undefined;
  const hasFilters =
    Boolean(q) || status !== "active" || page > 1 || statusParam === "all" || Boolean(filter);

  const branch = await getDefaultBranch();
  const arrears = branch ? await listArrears(branch.id) : [];
  const arrearsByTenancy = new Map(arrears.map((a) => [a.tenancyId, a]));
  const [{ rows, total, activeCount }, ending, properties, renters] = await Promise.all([
    searchTenancies({
      branchId: branch?.id,
      q,
      status,
      page,
      pageSize: ADMIN_LIST_PAGE_SIZE,
      filter,
      ids: filter === "arrears" ? arrears.map((a) => a.tenancyId) : undefined,
    }),
    searchTenancies({ branchId: branch?.id, status: "active", filter: "ending", pageSize: 1 }),
    listAllProperties(),
    listRenters(branch?.id),
  ]);

  const baseHref = listBaseHref("/tenancies", {
    q: q || null,
    status: status === "active" ? null : status,
    filter: filter ?? null,
  });
  const filterHref = (f: string) => (filter === f ? "/tenancies" : `/tenancies?filter=${f}`);

  return (
    <div>
      <AdminPageHeader
        title="Tenancies"
        description="Look up active and past tenancies. New tenancies are created from the Add button."
        actions={
          <AdminEntityDialog
            triggerLabel="Add tenancy"
            title="Add tenancy"
            description="Link a property and renter. Filter the lists if there are many options."
          >
            <TenancyForm
              compact
              properties={properties.map((p) => ({
                id: p.id,
                label: p.displayAddress,
              }))}
              renters={renters.map((r) => ({
                id: r.id,
                label: displayPersonName(r.firstName, r.lastName),
              }))}
            />
          </AdminEntityDialog>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatPill label="Active" value={activeCount} href="/tenancies" active={!filter && status === "active" && !q} />
        <StatPill
          label="In arrears"
          value={arrears.length}
          hint={arrears.length ? `${formatMoney(arrears.reduce((s, a) => s + a.balance, 0), { pence: false })} overdue` : "Nobody behind"}
          tone={arrears.length ? "danger" : "success"}
          href={filterHref("arrears")}
          active={filter === "arrears"}
        />
        <StatPill
          label="Ending in 60 days"
          value={ending.total}
          hint="Fixed term or end date"
          tone={ending.total ? "warning" : "neutral"}
          href={filterHref("ending")}
          active={filter === "ending"}
        />
      </div>

      <AdminSection title="Find tenancies">
        <Suspense fallback={<div className="h-10 animate-pulse rounded-md bg-muted" />}>
          <AdminListToolbar
            searchPlaceholder="Search property or renter…"
            defaultStatus="active"
            allStatusValue="all"
            statusOptions={[
              { value: "active", label: "Active" },
              { value: "ended", label: "Ended" },
            ]}
          />
        </Suspense>
      </AdminSection>

      <AdminSection title="Tenancies">
        {rows.length ? (
          <>
            <AdminTable
              headers={["Property", "Renter", "Rent", "Balance", "Ends", "Payment ref", "Status"]}
            >
              {rows.map(
                ({
                  tenancy,
                  propertyId,
                  propertyAddress,
                  renterFirstName,
                  renterLastName,
                }) => {
                  const paymentRef = getPaymentRefFromMetadata(tenancy.metadata);
                  const owed = arrearsByTenancy.get(tenancy.id);
                  const today = new Date().toISOString().slice(0, 10);
                  const endingSoon =
                    tenancy.endDate && tenancy.endDate >= today &&
                    new Date(`${tenancy.endDate}T12:00:00Z`).getTime() - Date.now() < 60 * 86400000;
                  return (
                  <tr key={tenancy.id} className="row-link">
                    <td className="px-4 py-3">
                      <Link
                        href={`/tenancies/${tenancy.id}`}
                        className="row-link-main"
                      >
                        {propertyAddress}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {displayPersonName(renterFirstName, renterLastName)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrency(Number(tenancy.rentAmount))}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {owed ? (
                        <span className="font-medium text-red-700">
                          {formatMoney(owed.balance)}
                          <span className="block text-xs font-normal">{owed.daysOverdue} days late</span>
                        </span>
                      ) : tenancy.status === "active" ? (
                        <span className="text-emerald-700">Up to date</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-sm ${endingSoon ? "font-medium text-amber-700" : "text-muted-foreground"}`}>
                      {tenancy.endDate ? formatDay(tenancy.endDate) : "Rolling"}
                      <span className="block text-xs font-normal text-muted-foreground">From {formatDay(tenancy.startDate)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {paymentRef ? <CopyPaymentRef value={paymentRef} /> : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tenancy.status} />
                    </td>
                  </tr>
                  );
                }
              )}
            </AdminTable>
            <AdminPagination page={page} total={total} baseHref={baseHref} />
          </>
        ) : hasFilters ? (
          <AdminEmptyState
            title="No tenancies match"
            description={
              q
                ? `Nothing found for “${q}”.`
                : "Try another status or clear filters."
            }
          >
            <Button asChild variant="outline" size="sm">
              <Link href="/tenancies">Clear filters</Link>
            </Button>
          </AdminEmptyState>
        ) : (
          <AdminEmptyState
            title="No active tenancies"
            description="Create a tenancy to link a renter to a property."
          />
        )}
      </AdminSection>
    </div>
  );
}
