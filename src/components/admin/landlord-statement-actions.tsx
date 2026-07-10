"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LandlordStatementActions() {
  const router = useRouter();
  const [from, setFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      await fetch("/api/admin/finance/landlord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_statements", from, to }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    window.location.href = `/api/admin/reports/landlord-statements?from=${from}&to=${to}`;
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="font-semibold">Generate period statements</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Creates downloadable statements from the landlord ledger for the selected dates.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            type="date"
            className="mt-1.5"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="date"
            className="mt-1.5"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2">
          <Button type="button" onClick={generate} disabled={loading}>
            {loading ? "Generating…" : "Generate statements"}
          </Button>
          <Button type="button" variant="outline" onClick={downloadCsv}>
            Download CSV
          </Button>
        </div>
      </div>
    </div>
  );
}
