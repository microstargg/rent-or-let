const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export function formatStatementMoney(
  value: number | undefined,
  opts?: { abs?: boolean }
): string {
  const n = Number(value ?? 0);
  return GBP.format(opts?.abs ? Math.abs(n) : n);
}

export function formatStatementIssuedAt(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function statementAdminPath(statementId: string): string {
  return `/admin/finance/statements/${statementId}`;
}

export function statementPortalPath(statementId: string): string {
  return `/landlord-portal/statements/${statementId}`;
}

export function statementPortalLoginUrl(origin: string, statementId: string): string {
  const next = statementPortalPath(statementId);
  return `${origin}/login?next=${encodeURIComponent(next)}`;
}
