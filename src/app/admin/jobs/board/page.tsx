import Link from "next/link";
import { Suspense } from "react";
import { listWorkOrders, getDefaultBranch, listContractors } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  StatusBadge,
  StatPill,
} from "@/components/admin/admin-page";
import { AdminListToolbar, FilterChip } from "@/components/admin/admin-list-toolbar";
import { JobBoardActions } from "@/components/admin/job-board-actions";
import { formatDate } from "@/lib/utils";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export default async function JobsBoardPage({
  searchParams,
}: {
  searchParams: Promise<{
    trade?: string;
    status?: string;
    view?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const branch = await getDefaultBranch();
  const jobs = await listWorkOrders({ branchId: branch?.id });
  const contractors = branch ? await listContractors(branch.id) : [];
  const trades = [...new Set(contractors.map((c) => c.trade).filter(Boolean))] as string[];

  const view = params.view ?? "";
  const q = params.q?.trim().toLowerCase() ?? "";
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const filtered = jobs.filter(({ workOrder, contractorName, ticketSummary, propertyAddress }) => {
    if (view === "open" && ["completed", "cancelled"].includes(workOrder.status)) return false;
    if (view === "today") {
      if (!workOrder.scheduledFor) return false;
      const when = new Date(workOrder.scheduledFor);
      if (when < todayStart || when > todayEnd) return false;
    }
    if (view === "awaiting" && workOrder.status !== "awaiting_approval") return false;
    if (params.status && workOrder.status !== params.status) return false;
    if (params.trade) {
      const c = contractors.find((x) => x.name === contractorName);
      if (c?.trade !== params.trade) return false;
    }
    if (q) {
      const hay = `${ticketSummary} ${propertyAddress} ${contractorName ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const awaiting = jobs.filter((j) => j.workOrder.status === "awaiting_approval").length;
  const open = jobs.filter((j) => !["completed", "cancelled"].includes(j.workOrder.status)).length;
  const todayCount = jobs.filter((j) => {
    if (!j.workOrder.scheduledFor) return false;
    const when = new Date(j.workOrder.scheduledFor);
    return when >= todayStart && when <= todayEnd;
  }).length;

  const statuses = ["draft", "awaiting_approval", "approved", "assigned", "completed"];

  const baseQuery = new URLSearchParams();
  if (params.status) baseQuery.set("status", params.status);
  if (params.trade) baseQuery.set("trade", params.trade);
  if (params.q) baseQuery.set("q", params.q);

  function viewHref(nextView: string) {
    const sp = new URLSearchParams(baseQuery);
    if (nextView) sp.set("view", nextView);
    else sp.delete("view");
    const qs = sp.toString();
    return qs ? `/admin/jobs/board?${qs}` : "/admin/jobs/board";
  }

  return (
    <div>
      <AdminPageHeader
        title="Jobs board"
        description="Field and office view of work orders. Completed jobs create a works invoice dated to the job, charged on the landlord statement."
        actions={
          <Button asChild variant="outline" size="sm" className="min-h-11">
            <Link href="/admin/tickets">Tickets</Link>
          </Button>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatPill label="Open jobs" value={open} />
        <StatPill
          label="Awaiting approval"
          value={awaiting}
          tone={awaiting ? "warning" : "success"}
        />
        <StatPill label="Scheduled today" value={todayCount} tone="info" />
        <StatPill label="Showing" value={filtered.length} hint="After filters" />
      </div>

      <AdminSection title="Quick views">
        <div className="flex flex-wrap gap-2">
          <FilterChip href={viewHref("")} active={!view} label="All" />
          <FilterChip href={viewHref("open")} active={view === "open"} label="Open" />
          <FilterChip href={viewHref("today")} active={view === "today"} label="Today" />
          <FilterChip
            href={viewHref("awaiting")}
            active={view === "awaiting"}
            label="Awaiting approval"
          />
        </div>
      </AdminSection>

      <AdminSection title="Search & filters">
        <Suspense fallback={<div className="h-10 animate-pulse rounded-md bg-muted" />}>
          <AdminListToolbar
            searchPlaceholder="Search address, job, or contractor…"
            statusOptions={statuses.map((s) => ({
              value: s,
              label: s.replaceAll("_", " "),
            }))}
          />
        </Suspense>
        {trades.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {trades.map((t) => {
              const sp = new URLSearchParams();
              if (params.status) sp.set("status", params.status);
              if (params.q) sp.set("q", params.q);
              if (view) sp.set("view", view);
              if (params.trade !== t) sp.set("trade", t);
              const qs = sp.toString();
              return (
                <FilterChip
                  key={t}
                  href={qs ? `/admin/jobs/board?${qs}` : "/admin/jobs/board"}
                  active={params.trade === t}
                  label={t}
                />
              );
            })}
          </div>
        )}
      </AdminSection>

      <AdminSection title="Jobs">
        {filtered.length ? (
          <div className="space-y-3">
            {filtered.map(
              ({ workOrder, contractorName, ticketSummary, propertyAddress, invoice }) => (
              <article
                key={workOrder.id}
                className="rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/tickets/${workOrder.ticketId}`}
                      className="text-base font-semibold hover:underline"
                    >
                      {ticketSummary}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted-foreground">{propertyAddress}</p>
                    <p className="mt-2 text-sm">
                      {contractorName ?? "Unassigned"}
                      {workOrder.costEstimate && ` · est £${workOrder.costEstimate}`}
                      {workOrder.finalCost && ` · final £${workOrder.finalCost}`}
                    </p>
                    {workOrder.scheduledFor && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Scheduled {formatDate(workOrder.scheduledFor)}
                      </p>
                    )}
                    {invoice && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Works invoice £{Number(invoice.amount).toFixed(2)} dated {invoice.dueDate}
                        {invoice.status === "billed"
                          ? " · on landlord statement"
                          : " · awaiting statement"}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={workOrder.status} />
                </div>
                <JobBoardActions
                  ticketId={workOrder.ticketId}
                  workOrderId={workOrder.id}
                  status={workOrder.status}
                  costEstimate={workOrder.costEstimate}
                  finalCost={workOrder.finalCost}
                />
              </article>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="No jobs match"
            description="Clear filters or create a work order from a ticket."
          >
            <Button asChild variant="outline" size="sm" className="min-h-11">
              <Link href="/admin/jobs/board">Clear filters</Link>
            </Button>
          </AdminEmptyState>
        )}
      </AdminSection>
    </div>
  );
}
