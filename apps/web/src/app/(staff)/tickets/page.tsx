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
  AdminTable,
  StatGrid,
  StatPill,
} from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { formatDateTime, humanize } from "@/lib/utils";
import { displayPersonName } from "@/lib/person-name";

function age(created: Date | string) {
  const days = Math.floor((Date.now() - new Date(created).getTime()) / 86400000);
  if (days < 1) return "Today";
  if (days < 14) return `${days}d`;
  if (days < 60) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

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
  const status = params.status ?? "open";
  const page = Math.max(1, Number(params.page) || 1);
  const hasFilters = Boolean(q) || status !== "open" || page > 1;

  const branch = await getDefaultBranch();
  const [{ rows, total, openCount }, properties] = await Promise.all([
    searchTickets({
      branchId: branch?.id,
      q,
      status,
      page,
      pageSize: TICKET_LIST_PAGE_SIZE,
    }),
    listAllProperties(),
  ]);

  const baseHref = listBaseHref("/tickets", {
    q: q || null,
    status: params.status || null,
  });

  return (
    <div>
      <AdminPageHeader
        title="Tickets"
        description="Triage maintenance requests. Field staff can complete jobs from the Jobs board."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="min-h-11">
              <Link href="/jobs/board">Jobs board</Link>
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

      <StatGrid columns={3}>
        <StatPill label="Open tickets" value={openCount} tone={openCount ? "warning" : "success"} href="/tickets" active={status === "open"} />
        <StatPill label="Matching" value={total} />
      </StatGrid>

      <AdminSection title="Tickets">
        <Suspense fallback={<div className="h-10 animate-pulse rounded-md bg-muted" />}>
          <AdminListToolbar
            searchPlaceholder="Search summary, address, or postcode…"
            statusOptions={[{ value: "open", label: "Open" }, ...TICKET_STATUSES]}
            defaultStatus="open"
          />
        </Suspense>
        {rows.length ? (
          <div className="mt-3">
            <AdminTable headers={["Ticket", "Property", "Tenant", "Priority", "Contractor", "Age", "Status"]}>
              {rows.map(({ ticket, propertyAddress, renterFirstName, renterLastName, contractorName }) => (
                <tr key={ticket.id} className="row-link align-top">
                  <td className="px-4 py-3">
                    <Link href={`/tickets/${ticket.id}`} className="row-link-main">
                      {ticket.summary}
                    </Link>
                    {ticket.isEmergency && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800">Emergency</span>}
                    <p className="text-xs text-muted-foreground">{humanize(ticket.source)}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{propertyAddress}</td>
                  <td className="px-4 py-3">
                    {renterFirstName || renterLastName ? displayPersonName(renterFirstName ?? "", renterLastName ?? "") : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {ticket.priority ? (
                      <span className={ticket.priority === "urgent" || ticket.priority === "high" ? "text-amber-700" : ""}>{humanize(ticket.priority)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{contractorName ?? <span className="text-muted-foreground">Not booked</span>}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground" title={formatDateTime(ticket.createdAt)}>
                    {age(ticket.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <TicketStatusSelect id={ticket.id} status={ticket.status} compact />
                  </td>
                </tr>
              ))}
            </AdminTable>
            <AdminPagination page={page} total={total} baseHref={baseHref} />
          </div>
        ) : hasFilters ? (
          <AdminEmptyState
            title="No tickets match"
            description={q ? `Nothing found for “${q}”.` : "Try another status or clear filters."}
          >
            <Button asChild variant="outline" size="sm" className="min-h-11">
              <Link href="/tickets">Clear filters</Link>
            </Button>
          </AdminEmptyState>
        ) : (
          <AdminEmptyState
            title="No open tickets"
            description="Nothing waiting. Pick All to see finished tickets."
          />
        )}
      </AdminSection>
    </div>
  );
}
