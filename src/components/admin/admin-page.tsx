import { cn } from "@/lib/utils";

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AdminSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-8", className)}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function AdminEmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center">
      <p className="font-medium text-foreground/80">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {children && <div className="mt-4 flex justify-center">{children}</div>}
    </div>
  );
}

export function StatusBadge({
  status,
  tone,
}: {
  status: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const resolved =
    tone ??
    (status === "paid" ||
    status === "valid" ||
    status === "completed" ||
    status === "approved" ||
    status === "available" ||
    status === "active" ||
    status === "resolved" ||
    status === "scheduled"
      ? "success"
      : status === "partial" ||
          status === "expiring" ||
          status === "awaiting_approval" ||
          status === "due" ||
          status === "let_agreed" ||
          status === "triaged" ||
          status === "investigating" ||
          status === "unmatched" ||
          status === "high"
        ? "warning"
        : status === "expired" ||
            status === "overpayment" ||
            status === "missing" ||
            status === "cancelled" ||
            status === "archived" ||
            status === "ended"
          ? "danger"
          : status === "underpayment" ||
              status === "new" ||
              status === "draft" ||
              status === "assigned" ||
              status === "open"
            ? "info"
            : "neutral");

  const tones: Record<string, string> = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
    warning: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
    danger: "bg-red-50 text-red-800 ring-1 ring-red-200",
    info: "bg-sky-50 text-sky-900 ring-1 ring-sky-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        tones[resolved]
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function StatPill({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "warning" | "danger" | "success" | "info";
}) {
  const tones = {
    neutral: "border-border bg-card",
    warning: "border-amber-200 bg-amber-50/60",
    danger: "border-red-200 bg-red-50/60",
    success: "border-emerald-200 bg-emerald-50/60",
    info: "border-sky-200 bg-sky-50/60",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3", tones[tone ?? "neutral"])}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function AdminTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  );
}
