"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/utils";

interface Row {
  tenancyId: string;
  propertyAddress: string;
  renterName: string;
  rentAmount: number;
  startDate: string;
}

type Entry = { kind: "arrears" | "credit"; amount: string };

/** Enter a client's opening balances in one go. Blank rows are left alone. */
export function OpeningBalancesTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filled = Object.entries(entries).filter(([, e]) => Number(e.amount) > 0);

  function update(id: string, patch: Partial<Entry>) {
    setEntries((prev) => {
      const base: Entry = prev[id] ?? { kind: "arrears", amount: "" };
      return { ...prev, [id]: { ...base, ...patch } };
    });
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/finance/opening-balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          as_of: asOf,
          rows: filled.map(([tenancyId, e]) => ({ tenancy_id: tenancyId, kind: e.kind, amount: Number(e.amount) })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { saved?: number; errors?: string[]; error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Something went wrong");
        return;
      }
      setEntries({});
      setMessage(
        `Saved ${data.saved ?? 0} opening balance${data.saved === 1 ? "" : "s"}.${data.errors?.length ? ` ${data.errors.join(" ")}` : ""}`
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-end gap-3 border-b p-4">
        <div>
          <Label className="text-xs">Balances correct as of</Label>
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-44" />
        </div>
        <p className="max-w-md text-xs text-muted-foreground">
          Usually the handover date. Leave a row blank if the tenant was square.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Property</th>
              <th className="px-4 py-2 font-medium">Renter</th>
              <th className="px-4 py-2 font-medium">Rent</th>
              <th className="px-4 py-2 font-medium">Balance</th>
              <th className="px-4 py-2 font-medium">Amount (£)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => {
              const e = entries[r.tenancyId];
              return (
                <tr key={r.tenancyId}>
                  <td className="px-4 py-2 font-medium">{r.propertyAddress}</td>
                  <td className="px-4 py-2">{r.renterName}</td>
                  <td className="px-4 py-2 tabular-nums text-muted-foreground">{formatMoney(r.rentAmount)}</td>
                  <td className="px-4 py-2">
                    <select
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                      value={e?.kind ?? "arrears"}
                      onChange={(ev) => update(r.tenancyId, { kind: ev.target.value as Entry["kind"] })}
                    >
                      <option value="arrears">Owes</option>
                      <option value="credit">In credit</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-32"
                      value={e?.amount ?? ""}
                      onChange={(ev) => update(r.tenancyId, { amount: ev.target.value })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t p-4">
        <Button size="sm" disabled={busy || filled.length === 0} onClick={save}>
          {busy ? "Saving…" : `Save ${filled.length || ""} opening balance${filled.length === 1 ? "" : "s"}`}
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
