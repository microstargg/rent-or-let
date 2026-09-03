import Link from "next/link";
import { Suspense } from "react";
import {
  searchTickets,
  getDefaultBranch,
  listAllProperties,
  TICKET_LIST_PAGE_SIZE,
} from "@/lib/db/queries";
import { TicketStatusSelect } from "@/components/admin/ticket-status-select";
import { TicketCreateForm } from "@/components/admin/ticket-create-form";
import { AdminEntityDialog } from "@/components/admin/admin-entity-dialog";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination, listBaseHref } from "@/components/admin/admin-pagination";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  StatusBadge,
  StatPill,
} from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";

const TICKET_STATUSES = [
  { value: "new", label: "New" },
  { value: "triaged", label: "Triaged" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const hasFilters = Boolean(q) || Boolean(status) || page > 1;

  const branch = await getDefaultBranch();
  const [{ rows, total, openCount }, properties] = await Promise.all([
    searchTickets({
      branchId: branch?.id,
      q,
      status: status || undefined,
      page,
      pageSize: TICKET_LIST_PAGE_SIZE,
    }),
    listAllProperties(),
  ]);

  const baseHref = listBaseHref("/admin/tickets", {
    q: q || null,
    status: status || null,
  });

  return (
    <div>
      <AdminPageHeader
        title="Tickets"
        description="Triage maintenance requests. Field staff can complete jobs from the Jobs board."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="min-h-11">
              <Link href="/admin/jobs/board">Jobs board</Link>
            </Button>
            <AdminEntityDialog
              triggerLabel="New ticket"
              title="Create ticket"
              description="Log a maintenance or repair request."
            >
              <TicketCreateForm
                compact
                properties={properties.map((p) => ({
                  id: p.id,
                  label: p.displayAddress,
                }))}
              />
            </AdminEntityDialog>
          </div>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatPill label="Open tickets" value={openCount} tone="warning" />
        <StatPill label="Showing" value={total} hint="After filters" />
        <StatPill label="On this page" value={rows.length} />
      </div>

      <AdminSection title="Find tickets">
        <Suspense fallback={<div className="h-10 animate-pulse rounded-md bg-muted" />}>
          <AdminListToolbar
            searchPlaceholder="Search summary, address, or postcode…"
            statusOptions={TICKET_STATUSES}
          />
        </Suspense>
      </AdminSection>

      <AdminSection title="Tickets">
        {rows.length ? (
          <>
            <div className="space-y-3">
              {rows.map(({ ticket, propertyAddress }) => (
                <div key={ticket.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/tickets/${ticket.id}`}
                        className="text-base font-semibold hover:underline"
                      >
                        {ticket.summary}
                      </Link>
                      <p className="mt-0.5 text-sm text-muted-foreground">{propertyAddress}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {ticket.source} ·{" "}
                        {new Date(ticket.createdAt).toLocaleString("en-GB")}
                        {ticket.priority ? ` · ${ticket.priority}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={ticket.status} />
                      <TicketStatusSelect id={ticket.id} status={ticket.status} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
                      <Link href={`/admin/tickets/${ticket.id}`}>Open</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <AdminPagination page={page} total={total} baseHref={baseHref} />
          </>
        ) : hasFilters ? (
          <AdminEmptyState
            title="No tickets match"
            description={q ? `Nothing found for “${q}”.` : "Try another status or clear filters."}
          >
            <Button asChild variant="outline" size="sm" className="min-h-11">
              <Link href="/admin/tickets">Clear filters</Link>
            </Button>
          </AdminEmptyState>
        ) : (
          <AdminEmptyState
            title="No tickets yet"
            description="Create a ticket when a maintenance request comes in."
          />
        )}
      </AdminSection>
    </div>
  );
}
