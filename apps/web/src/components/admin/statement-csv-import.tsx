"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function StatementCsvImport() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | null) {
    if (!file) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/bank-feed/import-csv", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed");
      } else {
        setMessage(
          `Credits ${data.credits} · imported ${data.imported} · duplicates ${data.duplicates} · matched ${data.matched} · queued ${data.exceptions}`
        );
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
      <h3 className="font-semibold">Import bank statement (CSV)</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload the CSV export from your bank. It needs a <code className="text-xs">Date</code>{" "}
        column, a <code className="text-xs">Description</code> or{" "}
        <code className="text-xs">Reference</code> column, and either a signed{" "}
        <code className="text-xs">Amount</code> or a <code className="text-xs">Credit</code> /{" "}
        <code className="text-xs">Paid in</code> column. Only money in is imported. Lines with a
        tenancy payment reference are matched to that tenant&apos;s oldest unpaid rent first.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={loading}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
        />
        {loading && (
          <Button type="button" size="sm" variant="outline" disabled>
            Importing…
          </Button>
        )}
      </div>
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
