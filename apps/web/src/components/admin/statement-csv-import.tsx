"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function StatementCsvImport({
  title = "Import bank statement (PDF or CSV)",
  description,
}: {
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function onFile(file: File | null) {
    if (!file) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    setWarning(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/bank-feed/import-csv", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed");
      } else {
        const range = data.from && data.to ? ` (${data.from} to ${data.to})` : "";
        setMessage(
          [
            `${data.imported} new line(s)${range}, ${data.duplicates} already imported.`,
            `Money in: ${data.credits} line(s), £${Number(data.creditTotal ?? 0).toFixed(2)}. ${data.matched} matched to tenants, ${data.exceptions} sent to Exceptions.`,
            `Money out: ${data.outgoingMatched} matched to payouts or jobs, ${data.outgoingUnmatched} not recognised.`,
          ].join(" ")
        );
        const read = Number(data.creditTotal ?? 0);
        const printed = data.statementMoneyIn;
        if (typeof printed === "number" && Math.abs(printed - read) > 0.01) {
          setWarning(
            `The statement says £${printed.toFixed(2)} came in, but £${read.toFixed(2)} was read. Check the imported lines below against the statement.`
          );
        }
        router.refresh();
      }
    } catch {
      setError("Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {description ??
          "Upload the PDF statement from your bank, or a CSV / TSV export. PDFs are read automatically and can take up to a minute. Money in is matched to tenants by payment reference; money out is checked against landlord payouts and contractor jobs. Lines already imported are skipped, so overlapping date ranges are fine."}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        A CSV needs <code>Date</code> and <code>Description</code> columns, plus either a signed{" "}
        <code>Amount</code> or <code>Paid in</code> / <code>Paid out</code>.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".pdf,application/pdf,.csv,text/csv,.tsv,text/tab-separated-values"
          disabled={loading}
          onChange={(e) => {
            void onFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
          className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
        />
        {loading && (
          <Button type="button" size="sm" variant="outline" disabled>
            Reading statement…
          </Button>
        )}
      </div>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
      {warning && <p className="mt-2 text-sm text-amber-700">{warning}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
