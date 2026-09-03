import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { searchProperties, ADMIN_LIST_PAGE_SIZE } from "@/lib/db/queries";
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
import { displayPersonName } from "@/lib/person-name";

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const sort =
    params.sort === "address" || params.sort === "rent" ? params.sort : "updated";
  const page = Math.max(1, Number(params.page) || 1);
  const hasFilters =
    Boolean(q) || Boolean(status) || sort !== "updated" || page > 1;

  const { rows, total, stats } = await searchProperties({
    q,
    status: status || undefined,
    sort,
    page,
    pageSize: ADMIN_LIST_PAGE_SIZE,
  });

  const baseHref = listBaseHref("/admin/properties", {
    q: q || null,
    status: status || null,
    sort: sort === "updated" ? null : sort,
  });

  return (
    <div>
      <AdminPageHeader
        title="Properties"
        description="Search and filter the portfolio. Open a property to edit details, images, and portal sync."
        actions={
          <Button asChild size="sm">
            <Link href="/admin/properties/new">Add property</Link>
          </Button>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatPill label="Total" value={stats.total} />
        <StatPill label="Available" value={stats.available} tone="success" />
        <StatPill
          label="Vacant"
          value={stats.vacant}
          tone={stats.vacant ? "warning" : "neutral"}
        />
      </div>

      <AdminSection title="Find properties">
        <Suspense fallback={<div className="h-10 animate-pulse rounded-md bg-muted" />}>
          <AdminListToolbar
            searchPlaceholder="Search address, postcode, or ref…"
            statusOptions={[
              { value: "draft", label: "Draft" },
              { value: "available", label: "Available" },
              { value: "let_agreed", label: "Let agreed" },
              { value: "archived", label: "Archived" },
            ]}
            sortOptions={[
              { value: "updated", label: "Recently updated" },
              { value: "address", label: "Address A–Z" },
              { value: "rent", label: "Rent high–low" },
            ]}
            defaultSort="updated"
          />
        </Suspense>
      </AdminSection>

      <AdminSection title="Properties" description={`${total} matching`}>
        {rows.length ? (
          <>
            <AdminTable
              headers={["Address", "Town", "Beds", "Rent", "Status", "Ref", "Landlord"]}
            >
              {rows.map(({ property, landlordFirstName, landlordLastName }) => {
                const landlordName =
                  landlordFirstName || landlordLastName
                    ? displayPersonName(
                        landlordFirstName ?? "",
                        landlordLastName ?? ""
                      )
                    : null;
                return (
                  <tr key={property.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/properties/${property.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {property.displayAddress}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{property.town}</td>
                    <td className="px-4 py-3 tabular-nums">{property.bedrooms}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCurrency(Number(property.pricePcm))}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={property.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{property.agentRef}</td>
                    <td className="px-4 py-3">
                      {landlordName ? (
                        <Link
                          href={`/admin/landlords?q=${encodeURIComponent(landlordName)}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {landlordName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </AdminTable>
            <AdminPagination page={page} total={total} baseHref={baseHref} />
          </>
        ) : hasFilters ? (
          <AdminEmptyState
            title="No properties match"
            description={
              q ? `Nothing found for “${q}”.` : "Try another status or clear filters."
            }
          >
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/properties">Clear filters</Link>
            </Button>
          </AdminEmptyState>
        ) : (
          <AdminEmptyState
            title="No properties yet"
            description="Add your first property to start building the portfolio."
          >
            <Button asChild size="sm">
              <Link href="/admin/properties/new">Add property</Link>
            </Button>
          </AdminEmptyState>
        )}
      </AdminSection>
    </div>
  );
}
