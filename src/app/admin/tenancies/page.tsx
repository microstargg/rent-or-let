import Link from "next/link";
import { Suspense } from "react";
import {
  searchTenancies,
  listAllProperties,
  listRenters,
  getDefaultBranch,
  ADMIN_LIST_PAGE_SIZE,
} from "@/lib/db/queries";
import { TenancyForm } from "@/components/admin/tenancy-form";
import { TenancyEndButton } from "@/components/admin/tenancy-end-button";
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
import { formatCurrency } from "@/lib/utils";
import { getPaymentRefFromMetadata } from "@/lib/payment-ref";
import { CopyPaymentRef } from "@/components/admin/copy-payment-ref";

export default async function AdminTenanciesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  // Default to active when status omitted; "all" shows everything
  const statusParam = params.status;
  const status =
    statusParam === "all" ? "all" : statusParam === "ended" ? "ended" : "active";
  const page = Math.max(1, Number(params.page) || 1);
  const hasFilters =
    Boolean(q) || status !== "active" || page > 1 || statusParam === "all";

  const branch = await getDefaultBranch();
  const [{ rows, total, activeCount }, properties, renters] = await Promise.all([
    searchTenancies({
      branchId: branch?.id,
      q,
      status,
      page,
      pageSize: ADMIN_LIST_PAGE_SIZE,
    }),
    listAllProperties(),
    listRenters(branch?.id),
  ]);

  const baseHref = listBaseHref("/admin/tenancies", {
    q: q || null,
    status: status === "active" ? null : status,
  });

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

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatPill label="Active" value={activeCount} tone="success" />
        <StatPill label="Showing" value={total} hint="After filters" />
        <StatPill label="On this page" value={rows.length} />
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
              headers={["Property", "Renter", "Rent", "Payment ref", "Dates", "Status", "Actions"]}
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
                  return (
                  <tr key={tenancy.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/properties/${propertyId}`}
                        className="font-medium text-primary hover:underline"
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
                    <td className="px-4 py-3">
                      {paymentRef ? <CopyPaymentRef value={paymentRef} /> : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {tenancy.startDate} — {tenancy.endDate ?? "ongoing"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tenancy.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {tenancy.status === "active" && <TenancyEndButton id={tenancy.id} />}
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
              <Link href="/admin/tenancies">Clear filters</Link>
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
