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
import { landlordBalancesById, landlordPortalStatuses, type PortalStatus } from "@/lib/db/queries/portfolio";
import { formatMoney } from "@/lib/utils";

const PORTAL_LABEL: Record<PortalStatus, { text: string; className: string }> = {
  active: { text: "Using portal", className: "text-emerald-700" },
  invited: { text: "Invited", className: "text-amber-700" },
  none: { text: "Not invited", className: "text-muted-foreground" },
};

const FILTERS = ["no_portal", "no_register"] as const;

export default async function AdminLandlordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const sort = params.sort === "name" ? "name" : "newest";
  const page = Math.max(1, Number(params.page) || 1);
  const filter = FILTERS.find((f) => f === params.filter);
  const hasFilters = Boolean(q) || sort !== "newest" || page > 1 || Boolean(filter);

  const [{ rows, total }, totalAll, noPortal, noRegister] = await Promise.all([
    searchLandlords({ q, sort, page, pageSize: ADMIN_LIST_PAGE_SIZE, filter }),
    countLandlords(),
    searchLandlords({ filter: "no_portal", pageSize: 1 }),
    searchLandlords({ filter: "no_register", pageSize: 1 }),
  ]);
  const ids = rows.map((r) => r.landlord.id);
  const [portal, balances] = await Promise.all([landlordPortalStatuses(ids), landlordBalancesById(ids)]);

  const baseHref = listBaseHref("/landlords", {
    q: q || null,
    sort: sort === "newest" ? null : sort,
    filter: filter ?? null,
  });
  const filterHref = (f: string) => (filter === f ? "/landlords" : `/landlords?filter=${f}`);

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

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatPill label="Landlords" value={totalAll} href="/landlords" active={!filter && !q} />
        <StatPill
          label="Not on the portal"
          value={noPortal.total}
          hint="Never signed in to see statements"
          tone={noPortal.total ? "warning" : "neutral"}
          href={filterHref("no_portal")}
          active={filter === "no_portal"}
        />
        <StatPill
          label="No register number"
          value={noRegister.total}
          hint="Needed for the landlord register"
          tone={noRegister.total ? "warning" : "neutral"}
          href={filterHref("no_register")}
          active={filter === "no_register"}
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
            <AdminTable headers={["Name", "Contact", "Properties", "Owed now", "Portal", "Actions"]}>
              {rows.map(({ landlord, propertyCount }) => (
                <tr key={landlord.id} className="row-link">
                  <td className="px-4 py-3">
                    <Link href={`/landlords/${landlord.id}`} className="row-link-main">
                      {displayPersonName(landlord.firstName, landlord.lastName)}
                    </Link>
                    {landlord.notes && (
                      <span className="block max-w-[16rem] truncate text-xs font-normal text-muted-foreground" title={landlord.notes}>
                        {landlord.notes}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-0.5">
                      {landlord.email && <CopyTextButton value={landlord.email} />}
                      {landlord.phone && <CopyTextButton value={landlord.phone} />}
                      {!landlord.email && !landlord.phone && <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{propertyCount}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {(balances.get(landlord.id) ?? 0) > 0.004 ? formatMoney(balances.get(landlord.id)) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className={`px-4 py-3 text-sm ${PORTAL_LABEL[portal.get(landlord.id) ?? "none"].className}`}>
                    {PORTAL_LABEL[portal.get(landlord.id) ?? "none"].text}
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
                            prsRegistrationNumber: landlord.prsRegistrationNumber,
                            serviceLevel: landlord.serviceLevel,
                            feePercent: landlord.feePercent,
                            lettingFee: landlord.lettingFee,
                            nrlStatus: landlord.nrlStatus,
                            nrlApprovalRef: landlord.nrlApprovalRef,
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
              <Link href="/landlords">Clear filters</Link>
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
