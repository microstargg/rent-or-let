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
import { JobAssigneeSelect } from "@/components/admin/assignee-select";
import { NewTaskDialog } from "@/components/admin/new-task-dialog";
import { TaskCardActions } from "@/components/admin/task-card-actions";
import { listAssignableStaff, listBoardTasks } from "@/lib/db/queries/notifications";
import { requireStaffSession } from "@/lib/auth/server";
import { londonDateKey } from "@/lib/notifications/preferences";
import { formatDate } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function AssigneeBadge({ name, isMe }: { name: string | null; isMe: boolean }) {
  if (!name) {
    return <span className="text-xs text-muted-foreground">Not assigned</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
        {initials(name)}
      </span>
      {isMe ? "You" : name}
    </span>
  );
}

export default async function JobsBoardPage({
  searchParams,
}: {
  searchParams: Promise<{
    trade?: string;
    status?: string;
    view?: string;
    who?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const [branch, session] = await Promise.all([getDefaultBranch(), requireStaffSession()]);
  const me = session?.user.id ?? null;
  const [jobs, contractors, staff, tasks] = await Promise.all([
    listWorkOrders({ branchId: branch?.id }),
    branch ? listContractors(branch.id) : Promise.resolve([]),
    listAssignableStaff(),
    branch ? listBoardTasks(branch.id) : Promise.resolve([]),
  ]);
  const trades = [...new Set(contractors.map((c) => c.trade).filter(Boolean))] as string[];
  const staffName = (id: string | null) => (id ? staff.find((s) => s.id === id)?.name ?? "Former staff" : null);

  const view = params.view ?? "";
  const who = params.who ?? "";
  const q = params.q?.trim().toLowerCase() ?? "";
  const today = londonDateKey();
  const isToday = (d: Date | string | null) => Boolean(d) && londonDateKey(new Date(d!)) === today;
  const dueByToday = (d: Date | string | null) => Boolean(d) && londonDateKey(new Date(d!)) <= today;
  const isOpenJob = (status: string) => !["completed", "cancelled"].includes(status);

  const matchesPerson = (assignee: string | null) => {
    if (view === "mine" && assignee !== me) return false;
    if (view === "unassigned" && assignee) return false;
    if (who && assignee !== who) return false;
    return true;
  };

  const filtered = jobs.filter(({ workOrder, contractorName, ticketSummary, propertyAddress }) => {
    if (view === "tasks") return false;
    if (!matchesPerson(workOrder.assigneeStaffId)) return false;
    if ((view === "mine" || view === "unassigned") && !isOpenJob(workOrder.status)) return false;
    if (view === "open" && !isOpenJob(workOrder.status)) return false;
    if (view === "today" && !isToday(workOrder.scheduledFor)) return false;
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

  const jobFiltersOnly = Boolean(params.status || params.trade || view === "open" || view === "awaiting");
  const filteredTasks = jobFiltersOnly
    ? []
    : tasks.filter(({ task, propertyAddress }) => {
        if (!matchesPerson(task.assigneeStaffId)) return false;
        if (view === "today" && !dueByToday(task.dueAt)) return false;
        if (q) {
          const hay = `${task.title} ${task.notes ?? ""} ${propertyAddress ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

  const awaiting = jobs.filter((j) => j.workOrder.status === "awaiting_approval").length;
  const open = jobs.filter((j) => isOpenJob(j.workOrder.status)).length;
  const myToday =
    jobs.filter(
      (j) => j.workOrder.assigneeStaffId === me && isOpenJob(j.workOrder.status) && dueByToday(j.workOrder.scheduledFor)
    ).length + tasks.filter((t) => t.task.assigneeStaffId === me && dueByToday(t.task.dueAt)).length;
  const tasksDue = tasks.filter((t) => dueByToday(t.task.dueAt)).length;

  const statuses = ["draft", "awaiting_approval", "approved", "assigned", "completed"];

  const baseQuery = new URLSearchParams();
  if (params.status) baseQuery.set("status", params.status);
  if (params.trade) baseQuery.set("trade", params.trade);
  if (params.q) baseQuery.set("q", params.q);
  if (who) baseQuery.set("who", who);

  function viewHref(nextView: string) {
    const sp = new URLSearchParams(baseQuery);
    if (nextView) sp.set("view", nextView);
    else sp.delete("view");
    const qs = sp.toString();
    return qs ? `/jobs/board?${qs}` : "/jobs/board";
  }

  return (
    <div>
      <AdminPageHeader
        title="Jobs board"
        description="Contractor jobs and office tasks in one place. Assign each one to a member of staff so it shows in their My jobs view and morning email."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="min-h-11">
              <Link href="/tickets">Tickets</Link>
            </Button>
            <NewTaskDialog staff={staff} currentStaffId={me} />
          </>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatPill label="Mine today" value={myToday} tone={myToday ? "info" : "success"} hint="Jobs and tasks, incl. overdue" />
        <StatPill label="Open jobs" value={open} />
        <StatPill
          label="Awaiting approval"
          value={awaiting}
          tone={awaiting ? "warning" : "success"}
        />
        <StatPill label="Tasks due" value={tasksDue} tone={tasksDue ? "warning" : "success"} hint="Today or overdue" />
      </div>

      <AdminSection title="Quick views">
        <div className="flex flex-wrap gap-2">
          <FilterChip href={viewHref("")} active={!view} label="All" />
          <FilterChip href={viewHref("mine")} active={view === "mine"} label="My jobs" />
          <FilterChip href={viewHref("today")} active={view === "today"} label="Today" />
          <FilterChip href={viewHref("unassigned")} active={view === "unassigned"} label="Unassigned" />
          <FilterChip href={viewHref("open")} active={view === "open"} label="Open" />
          <FilterChip href={viewHref("tasks")} active={view === "tasks"} label="Tasks" />
          <FilterChip
            href={viewHref("awaiting")}
            active={view === "awaiting"}
            label="Awaiting approval"
          />
        </div>
        {staff.length > 1 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Assigned to</span>
            {staff.map((s) => {
              const sp = new URLSearchParams(baseQuery);
              if (view) sp.set("view", view);
              if (who === s.id) sp.delete("who");
              else sp.set("who", s.id);
              const qs = sp.toString();
              return (
                <FilterChip
                  key={s.id}
                  href={qs ? `/jobs/board?${qs}` : "/jobs/board"}
                  active={who === s.id}
                  label={s.id === me ? `${s.name} (you)` : s.name}
                />
              );
            })}
          </div>
        )}
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
              if (who) sp.set("who", who);
              if (view) sp.set("view", view);
              if (params.trade !== t) sp.set("trade", t);
              const qs = sp.toString();
              return (
                <FilterChip
                  key={t}
                  href={qs ? `/jobs/board?${qs}` : "/jobs/board"}
                  active={params.trade === t}
                  label={t}
                />
              );
            })}
          </div>
        )}
      </AdminSection>

      {view !== "tasks" && (
      <AdminSection title="Contractor jobs" description={`${filtered.length} showing`}>
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
                      href={`/tickets/${workOrder.ticketId}`}
                      className="text-base font-semibold hover:underline"
                    >
                      {ticketSummary}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted-foreground">{propertyAddress}</p>
                    <p className="mt-2 text-sm">
                      {contractorName ?? "Unassigned"}
                      {workOrder.costEstimate && ` · est £${workOrder.costEstimate}`}
                      {workOrder.finalCost && ` · contractor £${workOrder.finalCost}`}
                      {workOrder.clientCharge && ` · client £${workOrder.clientCharge}`}
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
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={workOrder.status} />
                    <AssigneeBadge
                      name={staffName(workOrder.assigneeStaffId)}
                      isMe={workOrder.assigneeStaffId === me}
                    />
                  </div>
                </div>
                {isOpenJob(workOrder.status) && staff.length > 0 && (
                  <JobAssigneeSelect
                    ticketId={workOrder.ticketId}
                    workOrderId={workOrder.id}
                    value={workOrder.assigneeStaffId}
                    staff={staff}
                  />
                )}
                <JobBoardActions
                  ticketId={workOrder.ticketId}
                  workOrderId={workOrder.id}
                  status={workOrder.status}
                  costEstimate={workOrder.costEstimate}
                  finalCost={workOrder.finalCost}
                  clientCharge={workOrder.clientCharge}
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
              <Link href="/jobs/board">Clear filters</Link>
            </Button>
          </AdminEmptyState>
        )}
      </AdminSection>
      )}

      {!jobFiltersOnly && (
        <AdminSection
          title="Tasks"
          description="Office jobs, including certificate renewals the system adds automatically."
        >
          {filteredTasks.length ? (
            <div className="space-y-3">
              {filteredTasks.map(({ task, href, propertyAddress, complianceType }) => {
                const overdue = task.dueAt && londonDateKey(new Date(task.dueAt)) < today;
                const dueToday = isToday(task.dueAt);
                return (
                  <article key={task.id} className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold">
                          {href ? (
                            <Link href={href} className="hover:underline">
                              {task.title}
                            </Link>
                          ) : (
                            task.title
                          )}
                        </p>
                        {(propertyAddress || complianceType) && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {propertyAddress ?? complianceType?.replaceAll("_", " ")}
                          </p>
                        )}
                        {task.notes && <p className="mt-2 whitespace-pre-line text-sm">{task.notes}</p>}
                        {task.dueAt && (
                          <p
                            className={
                              overdue
                                ? "mt-1 text-xs font-medium text-red-600"
                                : dueToday
                                  ? "mt-1 text-xs font-medium text-amber-700"
                                  : "mt-1 text-xs text-muted-foreground"
                            }
                          >
                            {overdue ? "Overdue, was due " : dueToday ? "Due today, " : "Due "}
                            {formatDate(task.dueAt)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge status="task" tone="neutral" />
                        <AssigneeBadge
                          name={staffName(task.assigneeStaffId)}
                          isMe={task.assigneeStaffId === me}
                        />
                      </div>
                    </div>
                    <TaskCardActions
                      taskId={task.id}
                      assigneeStaffId={task.assigneeStaffId}
                      dueAt={task.dueAt}
                      href={href}
                      staff={staff}
                    />
                  </article>
                );
              })}
            </div>
          ) : (
            <AdminEmptyState
              title={view === "mine" ? "No tasks for you" : "No tasks match"}
              description="Add one with New task. Certificate renewals appear here on their own."
            />
          )}
        </AdminSection>
      )}
    </div>
  );
}
