import Link from "next/link";
import { Suspense } from "react";
import {
  searchLandlords,
  countLandlords,
  ADMIN_LIST_PAGE_SIZE,
} from "@/lib/db/queries";
import { LandlordForm } from "@/components/admin/landlord-form";
import { LandlordInviteButton } from "@/components/admin/landlord-invite-button";
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

export default async function AdminLandlordsPage({
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
    searchLandlords({ q, sort, page, pageSize: ADMIN_LIST_PAGE_SIZE }),
    countLandlords(),
  ]);

  const baseHref = listBaseHref("/admin/landlords", {
    q: q || null,
    sort: sort === "newest" ? null : sort,
  });

  return (
    <div>
      <AdminPageHeader
        title="Landlords"
        description="Look up property owners, invite them to the portal, or add a new landlord."
        actions={
          <AdminEntityDialog
            triggerLabel="Add landlord"
            title="Add landlord"
            description="Create a new landlord record."
          >
            <LandlordForm compact />
          </AdminEntityDialog>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatPill label="Total landlords" value={totalAll} />
        <StatPill label="Showing" value={total} hint={q ? "Matching search" : "All records"} />
        <StatPill
          label="On this page"
          value={rows.length}
          hint={`Page size ${ADMIN_LIST_PAGE_SIZE}`}
        />
      </div>

      <AdminSection title="Find landlords">
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

      <AdminSection title="Landlords">
        {rows.length ? (
          <>
            <AdminTable headers={["Name", "Email", "Phone", "Properties", "Notes", "Actions"]}>
              {rows.map(({ landlord, propertyCount }) => (
                <tr key={landlord.id}>
                  <td className="px-4 py-3 font-medium">
                    {displayPersonName(landlord.firstName, landlord.lastName)}
                  </td>
                  <td className="px-4 py-3">
                    {landlord.email ? (
                      <CopyTextButton value={landlord.email} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {landlord.phone ? (
                      <CopyTextButton value={landlord.phone} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{propertyCount}</td>
                  <td className="max-w-[12rem] truncate px-4 py-3 text-muted-foreground">
                    {landlord.notes || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <AdminEntityDialog
                        triggerLabel="Edit"
                        title="Edit landlord"
                        triggerVariant="ghost"
                        triggerSize="sm"
                      >
                        <LandlordForm
                          compact
                          initial={{
                            id: landlord.id,
                            firstName: landlord.firstName,
                            lastName: landlord.lastName,
                            email: landlord.email,
                            phone: landlord.phone,
                            notes: landlord.notes,
                          }}
                        />
                      </AdminEntityDialog>
                      {landlord.email && <LandlordInviteButton landlordId={landlord.id} />}
                    </div>
                  </td>
                </tr>
              ))}
            </AdminTable>
            <AdminPagination page={page} total={total} baseHref={baseHref} />
          </>
        ) : hasFilters ? (
          <AdminEmptyState
            title="No landlords match"
            description={q ? `Nothing found for “${q}”.` : "Try clearing filters."}
          >
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/landlords">Clear filters</Link>
            </Button>
          </AdminEmptyState>
        ) : (
          <AdminEmptyState
            title="No landlords yet"
            description="Add your first landlord to start linking properties."
          />
        )}
      </AdminSection>
    </div>
  );
}
