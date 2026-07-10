import Link from "next/link";
import { Suspense } from "react";
import {
  searchRenters,
  countRenters,
  ADMIN_LIST_PAGE_SIZE,
} from "@/lib/db/queries";
import { RenterForm } from "@/components/admin/renter-form";
import { RenterInviteButton } from "@/components/admin/renter-invite-button";
import { AdminEntityDialog } from "@/components/admin/admin-entity-dialog";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination, listBaseHref } from "@/components/admin/admin-pagination";
import { CopyTextButton } from "@/components/admin/copy-text-button";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  AdminTable,
  StatPill,
} from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { displayPersonName } from "@/lib/person-name";

export default async function AdminRentersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const sort = params.sort === "name" ? "name" : "newest";
  const page = Math.max(1, Number(params.page) || 1);
  const hasFilters = Boolean(q) || sort !== "newest" || page > 1;

  const [{ rows, total }, totalAll] = await Promise.all([
    searchRenters({ q, sort, page, pageSize: ADMIN_LIST_PAGE_SIZE }),
    countRenters(),
  ]);

  const baseHref = listBaseHref("/admin/renters", {
    q: q || null,
    sort: sort === "newest" ? null : sort,
  });

  return (
    <div>
      <AdminPageHeader
        title="Renters"
        description="Find tenants, invite them to the portal, or add a new renter."
        actions={
          <AdminEntityDialog
            triggerLabel="Add renter"
            title="Add renter"
            description="Create a new renter record."
          >
            <RenterForm compact />
          </AdminEntityDialog>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatPill label="Total renters" value={totalAll} />
        <StatPill label="Showing" value={total} hint={q ? "Matching search" : "All records"} />
        <StatPill
          label="On this page"
          value={rows.length}
          hint={`Page size ${ADMIN_LIST_PAGE_SIZE}`}
        />
      </div>

      <AdminSection title="Find renters">
        <Suspense fallback={<div className="h-10 animate-pulse rounded-md bg-muted" />}>
          <AdminListToolbar
            searchPlaceholder="Search name, email, or phone…"
            sortOptions={[
              { value: "newest", label: "Newest first" },
              { value: "name", label: "Name A–Z" },
            ]}
            defaultSort="newest"
          />
        </Suspense>
      </AdminSection>

      <AdminSection title="Renters">
        {rows.length ? (
          <>
            <AdminTable headers={["Name", "Email", "Phone", "Notes", "Actions"]}>
              {rows.map((renter) => (
                <tr key={renter.id}>
                  <td className="px-4 py-3 font-medium">
                    {displayPersonName(renter.firstName, renter.lastName)}
                  </td>
                  <td className="px-4 py-3">
                    {renter.email ? (
                      <CopyTextButton value={renter.email} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {renter.phone ? (
                      <CopyTextButton value={renter.phone} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="max-w-[12rem] truncate px-4 py-3 text-muted-foreground">
                    {renter.notes || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <AdminEntityDialog
                        triggerLabel="Edit"
                        title="Edit renter"
                        triggerVariant="ghost"
                        triggerSize="sm"
                      >
                        <RenterForm
                          compact
                          initial={{
                            id: renter.id,
                            firstName: renter.firstName,
                            lastName: renter.lastName,
                            email: renter.email,
                            phone: renter.phone,
                            notes: renter.notes,
                          }}
                        />
                      </AdminEntityDialog>
                      {renter.email && (
                        <RenterInviteButton renterId={renter.id} email={renter.email} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </AdminTable>
            <AdminPagination page={page} total={total} baseHref={baseHref} />
          </>
        ) : hasFilters ? (
          <AdminEmptyState
            title="No renters match"
            description={q ? `Nothing found for “${q}”.` : "Try clearing filters."}
          >
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/renters">Clear filters</Link>
            </Button>
          </AdminEmptyState>
        ) : (
          <AdminEmptyState
            title="No renters yet"
            description="Add a renter before creating a tenancy."
          />
        )}
      </AdminSection>
    </div>
  );
}
