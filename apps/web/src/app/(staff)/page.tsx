import Link from "next/link";
import { getDefaultBranch } from "@/lib/db/queries";
import { listAssignableStaff } from "@/lib/db/queries/notifications";
import { requireStaffSession } from "@/lib/auth/server";
import { DASHBOARD_LIST_LIMIT, loadDashboard } from "@/lib/dashboard";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";

const LIMIT = DASHBOARD_LIST_LIMIT;

function shortDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
  });
}

function time(d: Date | string): string {
  return new Date(d).toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function prettyType(t: string): string {
  const s = t.replaceAll("_", " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function plural(n: number, word: string, many = `${word}s`): string {
  return `${n} ${n === 1 ? word : many}`;
}

function greeting(now: Date): string {
  const hour = Number(
    now.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", hour12: false })
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

type Tone = "neutral" | "warning" | "danger" | "success";

function Headline({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href: string;
  tone: Tone;
}) {
  const tones: Record<Tone, string> = {
    neutral: "border-border bg-card",
    warning: "border-amber-200 bg-amber-50/60",
    danger: "border-red-200 bg-red-50/60",
    success: "border-emerald-200 bg-emerald-50/60",
  };
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl border px-4 py-3 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        tones[tone]
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </Link>
  );
}

interface Row {
  key: string;
  label: string;
  detail?: string;
  href: string;
  urgent?: boolean;
}

/** One list on the dashboard. Renders nothing when there is nothing to do. */
function ActionList({
  title,
  rows,
  total,
  seeAllHref,
}: {
  title: string;
  rows: Row[];
  total?: number;
  seeAllHref?: string;
}) {
  const count = total ?? rows.length;
  if (!count) return null;
  return (
    <section className="mb-4 break-inside-avoid rounded-xl border bg-card">
      <div className="flex items-baseline justify-between gap-2 border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      <ul className="divide-y">
        {rows.slice(0, LIMIT).map((r) => (
          <li key={r.key}>
            <Link href={r.href} className="block px-4 py-2.5 hover:bg-muted/40">
              <span className="block truncate text-sm font-medium">{r.label}</span>
              {r.detail && (
                <span className={cn("block truncate text-xs", r.urgent ? "text-red-700" : "text-muted-foreground")}>
                  {r.detail}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {seeAllHref && count > LIMIT && (
        <Link href={seeAllHref} className="block border-t px-4 py-2 text-xs font-medium text-primary hover:underline">
          See all {count}
        </Link>
      )}
    </section>
  );
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const [branch, session, staff] = await Promise.all([
    getDefaultBranch(),
    requireStaffSession(),
    listAssignableStaff(),
  ]);
  const me = session?.user.id ?? null;
  const myName = staff.find((s) => s.id === me)?.name?.split(" ")[0] ?? null;
  const dateLabel = now.toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {greeting(now)}
          {myName ? `, ${myName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild>
          <Link href="/properties/new">Add new property</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/tenancies">Create tenancy</Link>
        </Button>
      </div>
    </div>
  );

  if (!branch) {
    return <div>{header}</div>;
  }

  const d = await loadDashboard(branch.id, me, now);
  const dueLabel = (date: Date | string, verb = "was") =>
    d.isToday(date) ? "Today" : `Overdue, ${verb} ${shortDate(date)}`;

  const myDue = d.myJobs.length + d.myTasks.length;
  const myOverdue =
    d.myJobs.filter((j) => !d.isToday(j.scheduledFor)).length +
    d.myTasks.filter((t) => !d.isToday(t.task.dueAt)).length;

  const yourDay = [
    <ActionList
      key="jobs"
      title="Your jobs"
      seeAllHref="/jobs/board?view=mine"
      rows={d.myJobs.map((j) => ({
        key: j.id,
        label: j.summary,
        detail: `${j.address} · ${dueLabel(j.scheduledFor!)}`,
        href: "/jobs/board?view=mine",
        urgent: !d.isToday(j.scheduledFor),
      }))}
    />,
    <ActionList
      key="tasks"
      title="Your tasks"
      seeAllHref="/jobs/board?view=mine"
      rows={d.myTasks.map((t) => ({
        key: t.task.id,
        label: t.task.title,
        detail: d.isToday(t.task.dueAt) ? "Due today" : `Overdue, was due ${shortDate(t.task.dueAt!)}`,
        href: t.href ?? "/jobs/board?view=mine",
        urgent: !d.isToday(t.task.dueAt),
      }))}
    />,
    <ActionList
      key="viewings"
      title="Viewings today"
      seeAllHref="/enquiries"
      rows={d.viewingsToday.map((v) => ({
        key: v.viewing.id,
        label: `${time(v.viewing.scheduledAt)} · ${v.propertyAddress}`,
        detail: v.contact.name ?? undefined,
        href: `/properties/${v.propertyId}`,
      }))}
    />,
  ];

  const attention = [
    <ActionList
      key="arrears"
      title="Arrears"
      seeAllHref="/finance/arrears"
      rows={d.arrears.map((r) => ({
        key: r.tenancyId,
        label: `${r.propertyAddress}`,
        detail: `${r.renterName} · ${formatCurrency(r.balance)} · ${plural(r.daysOverdue, "day")} overdue${r.plan ? " · on a payment plan" : ""}`,
        href: `/tenancies/${r.tenancyId}`,
        urgent: r.daysOverdue >= 14,
      }))}
    />,
    <ActionList
      key="certificates"
      title="Certificates"
      seeAllHref="/compliance"
      rows={d.certificates.map((c) => ({
        key: c.id,
        label: `${prettyType(c.type)}: ${c.address}`,
        detail:
          c.status === "expired"
            ? `Expired${c.expiresAt ? ` ${shortDate(c.expiresAt)}` : ""}`
            : `Expires ${c.expiresAt ? shortDate(c.expiresAt) : "soon"}`,
        href: `/properties/${c.propertyId}`,
        urgent: c.status === "expired",
      }))}
    />,
    <ActionList
      key="hazards"
      title="Damp and mould deadlines"
      seeAllHref="/tickets"
      rows={d.hazards.map((h) => ({
        key: h.id,
        label: `${h.summary}: ${h.address}`,
        detail: `${h.step.label} · ${h.step.state === "overdue" ? "overdue since" : "due"} ${shortDate(h.step.dueAt!)}`,
        href: `/tickets/${h.id}`,
        urgent: h.step.state === "overdue",
      }))}
    />,
    <ActionList
      key="payments"
      title="Payments to check"
      seeAllHref="/finance/exceptions"
      rows={d.exceptions.map((e) => ({
        key: e.exception.id,
        label: `${formatCurrency(Number(e.exception.amount))} · ${prettyType(e.exception.kind)}`,
        detail: [e.propertyAddress, shortDate(e.exception.createdAt)].filter(Boolean).join(" · "),
        href: "/finance/exceptions",
      }))}
    />,
    <ActionList
      key="inspections"
      title="Overdue inspections"
      seeAllHref="/inspections"
      rows={d.overdueInspections.map((i) => ({
        key: i.inspection.id,
        label: i.propertyAddress,
        detail: `${prettyType(i.inspection.type)}${i.inspection.scheduledAt ? ` · was ${shortDate(i.inspection.scheduledAt)}` : ""}`,
        href: `/inspections/${i.inspection.id}`,
        urgent: true,
      }))}
    />,
    <ActionList
      key="unassigned"
      title="Unassigned tasks due"
      seeAllHref="/jobs/board?view=unassigned"
      rows={d.unassignedTasks.map((t) => ({
        key: t.task.id,
        label: t.task.title,
        detail: d.isToday(t.task.dueAt) ? "Due today" : `Overdue, was due ${shortDate(t.task.dueAt!)}`,
        href: "/jobs/board?view=unassigned",
        urgent: !d.isToday(t.task.dueAt),
      }))}
    />,
    <ActionList
      key="enquiries"
      title="New enquiries"
      seeAllHref="/enquiries"
      total={d.newEnquiryCount}
      rows={d.newEnquiries.map((e) => ({
        key: e.id,
        label: e.name,
        detail: [e.propertyAddress, shortDate(e.createdAt)].filter(Boolean).join(" · "),
        href: "/enquiries",
      }))}
    />,
    <ActionList
      key="applications"
      title="Applications to review"
      seeAllHref="/applications"
      total={d.applicationCount}
      rows={d.applications.map((a) => ({
        key: a.id,
        label: `${a.firstName} ${a.lastName}`.trim(),
        detail: [a.propertyAddress, shortDate(a.createdAt)].filter(Boolean).join(" · "),
        href: "/applications",
      }))}
    />,
  ];

  const hasYourDay = myDue > 0 || d.viewingsToday.length > 0;
  const hasAttention =
    d.arrears.length +
      d.certificates.length +
      d.hazards.length +
      d.exceptions.length +
      d.overdueInspections.length +
      d.unassignedTasks.length +
      d.newEnquiryCount +
      d.applicationCount >
    0;

  const alerts = [
    d.openComplaints > 0 && { text: `${plural(d.openComplaints, "complaint")} open`, href: "/complaints" },
    d.failedSyncs > 0 && { text: `${plural(d.failedSyncs, "portal sync")} failed`, href: "/portals" },
  ].filter((a): a is { text: string; href: string } => Boolean(a));

  return (
    <div>
      {header}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Headline
          label="Arrears"
          value={formatCurrency(d.arrearsTotal)}
          hint={
            d.arrears.length
              ? `${plural(d.arrears.length, "tenancy", "tenancies")}${d.arrearsSevere ? `, ${d.arrearsSevere} 14+ days late` : ""}`
              : "Nobody owes rent"
          }
          href="/finance/arrears"
          tone={d.arrearsSevere ? "danger" : d.arrears.length ? "warning" : "success"}
        />
        <Headline
          label="Certificates"
          value={d.certificates.length}
          hint={
            d.certificates.length
              ? `${d.certificatesExpired} expired, ${d.certificates.length - d.certificatesExpired} expiring`
              : "All in date"
          }
          href="/compliance"
          tone={d.certificatesExpired ? "danger" : d.certificates.length ? "warning" : "success"}
        />
        <Headline
          label="Your jobs and tasks"
          value={myDue}
          hint={myDue ? (myOverdue ? `${myOverdue} overdue` : "All due today") : "Nothing due today"}
          href="/jobs/board?view=mine"
          tone={myOverdue ? "danger" : myDue ? "warning" : "success"}
        />
        <Headline
          label="Payments to check"
          value={d.exceptions.length}
          hint={d.exceptions.length ? "Didn't match a tenant or invoice" : "Everything matched"}
          href="/finance/exceptions"
          tone={d.exceptions.length ? "warning" : "success"}
        />
      </div>

      {alerts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {alerts.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 hover:underline"
            >
              {a.text}
            </Link>
          ))}
        </div>
      )}

      {!hasYourDay && !hasAttention ? (
        <div className="mt-8 rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center">
          <p className="font-medium text-foreground/80">All clear</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Nothing is overdue or waiting on you right now.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-5">
          <div className="min-w-0 lg:col-span-2">
            <h2 className="mb-3 text-base font-semibold tracking-tight">Your day</h2>
            {hasYourDay ? (
              <div>{yourDay}</div>
            ) : (
              <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                Nothing assigned to you today.
              </p>
            )}
          </div>
          <div className="min-w-0 lg:col-span-3">
            <h2 className="mb-3 text-base font-semibold tracking-tight">Needs attention</h2>
            {hasAttention ? (
              <div className="gap-4 md:columns-2">{attention}</div>
            ) : (
              <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                Nothing waiting across the agency.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
