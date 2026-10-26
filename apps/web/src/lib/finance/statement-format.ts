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
  return `/finance/statements/${statementId}`;
}

export function statementPortalPath(statementId: string): string {
  return `/landlord-portal/statements/${statementId}`;
}

export function statementPortalLoginUrl(origin: string, statementId: string): string {
  const next = statementPortalPath(statementId);
  return `${origin}/login?next=${encodeURIComponent(next)}`;
}

/**
 * Nest individual property statements under the overall client statement they were
 * generated with. Order of the overall statements is preserved; property statements
 * whose overall statement is missing are listed on their own.
 */
export function groupStatementsWithProperties<
  T extends { statement: { id: string; parentStatementId?: string | null } },
>(rows: T[], labelOf?: (row: T) => string): { overall: T; properties: T[] }[] {
  const ids = new Set(rows.map((r) => r.statement.id));
  const children = new Map<string, T[]>();
  for (const row of rows) {
    const parent = row.statement.parentStatementId;
    if (!parent || !ids.has(parent)) continue;
    const list = children.get(parent) ?? [];
    list.push(row);
    children.set(parent, list);
  }
  return rows
    .filter((r) => !r.statement.parentStatementId || !ids.has(r.statement.parentStatementId))
    .map((overall) => {
      const properties = children.get(overall.statement.id) ?? [];
      if (labelOf) properties.sort((a, b) => labelOf(a).localeCompare(labelOf(b)));
      return { overall, properties };
    });
}
