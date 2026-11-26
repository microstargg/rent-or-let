import Link from "next/link";
import { Suspense } from "react";
import {
  searchRenters,
  countRenters,
  getDefaultBranch,
  ADMIN_LIST_PAGE_SIZE,
} from "@/lib/db/queries";
import { currentTenancyByRenter } from "@/lib/db/queries/portfolio";
import { formatDay, formatMoney } from "@/lib/utils";
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

/** Only renters living in (or about to move into) a property need a Right to Rent check, so only they get flagged. */
function rtrSummary(checkedAt: string | null, expiresAt: string | null, today: string, hasTenancy: boolean) {
  if (!checkedAt) return hasTenancy ? <span className="text-amber-700">Not checked</span> : <span className="text-muted-foreground">Not needed yet</span>;
  if (expiresAt && expiresAt < today) return <span className="text-red-600">Follow-up overdue</span>;
  if (expiresAt) return `Follow-up ${formatDay(expiresAt)}`;
  return "Checked";
}

const FILTERS = ["current", "rtr"] as const;

export default async function AdminRentersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const sort = params.sort === "name" ? "name" : "newest";
  const page = Math.max(1, Number(params.page) || 1);
  const filter = FILTERS.find((f) => f === params.filter);
  const today = new Date().toISOString().slice(0, 10);
  const hasFilters = Boolean(q) || sort !== "newest" || page > 1 || Boolean(filter);

  const [{ rows, total }, totalAll, current, rtr, branch] = await Promise.all([
    searchRenters({ q, sort, page, pageSize: ADMIN_LIST_PAGE_SIZE, filter }),
    countRenters(),
    searchRenters({ filter: "current", pageSize: 1 }),
    searchRenters({ filter: "rtr", pageSize: 1 }),
    getDefaultBranch(),
  ]);
  const tenancyByRenter = await currentTenancyByRenter(
    rows.map((r) => r.id),
    branch?.id
  );

  const baseHref = listBaseHref("/renters", {
    q: q || null,
    sort: sort === "newest" ? null : sort,
    filter: filter ?? null,
  });
  const filterHref = (f: string) => (filter === f ? "/renters" : `/renters?filter=${f}`);

  return (
    <div>
      <AdminPageHeader
        title="Renters"
        description="Find tenants, open their profile for Right to Rent and documents, or add a new renter."
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

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatPill label="Renters" value={totalAll} href="/renters" active={!filter && !q} />
        <StatPill
          label="Living in a property"
          value={current.total}
          hint="Current or about to move in"
          href={filterHref("current")}
          active={filter === "current"}
        />
        <StatPill
          label="Right to Rent to check"
          value={rtr.total}
          hint="Tenants with no check recorded"
          tone={rtr.total ? "warning" : "success"}
          href={filterHref("rtr")}
          active={filter === "rtr"}
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
            <AdminTable headers={["Name", "Contact", "Property", "Balance", "Right to Rent", "Actions"]}>
              {rows.map((renter) => {
                const t = tenancyByRenter.get(renter.id);
                return (
                <tr key={renter.id} className="row-link">
                  <td className="px-4 py-3">
                    <Link href={`/renters/${renter.id}`} className="row-link-main">
                      {displayPersonName(renter.firstName, renter.lastName)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-0.5">
                      {renter.email && <CopyTextButton value={renter.email} />}
                      {renter.phone && <CopyTextButton value={renter.phone} />}
                      {!renter.email && !renter.phone && <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {t ? (
                      <Link href={`/tenancies/${t.tenancyId}`} className="hover:underline">
                        {t.propertyAddress}
                        {t.status !== "active" && (
                          <span className="block text-xs text-muted-foreground">Moves in {formatDay(t.startDate)}</span>
                        )}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {!t ? (
                      <span className="text-muted-foreground">—</span>
                    ) : t.arrears > 0.004 ? (
                      <span className="font-medium text-red-700">{formatMoney(t.arrears)} overdue</span>
                    ) : (
                      <span className="text-emerald-700">Up to date</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {rtrSummary(renter.rtrCheckedAt, renter.rtrExpiresAt, today, Boolean(t))}
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
                );
              })}
            </AdminTable>
            <AdminPagination page={page} total={total} baseHref={baseHref} />
          </>
        ) : hasFilters ? (
          <AdminEmptyState
            title="No renters match"
            description={q ? `Nothing found for “${q}”.` : "Try clearing filters."}
          >
            <Button asChild variant="outline" size="sm">
              <Link href="/renters">Clear filters</Link>
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
