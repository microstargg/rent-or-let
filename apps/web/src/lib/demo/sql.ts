import { DEMO_TABLE_ORDER, type DemoDataset, type DemoRow } from "./dataset";

function literal(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Non-finite number in demo data: ${value}`);
    return String(value);
  }
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (typeof value === "object") return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** Multi-row INSERTs, chunked so no single statement gets too large. */
export function demoInsertStatements(data: DemoDataset, chunkSize = 250): string[] {
  const statements: string[] = [];
  for (const table of DEMO_TABLE_ORDER) {
    const rows = data[table];
    if (rows.length === 0) continue;
    const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const values = chunk
        .map((row: DemoRow) => `(${columns.map((c) => (c in row ? literal(row[c]) : "DEFAULT")).join(", ")})`)
        .join(",\n");
      statements.push(`INSERT INTO ${table} (${columns.join(", ")}) VALUES\n${values}`);
    }
  }
  return statements;
}
