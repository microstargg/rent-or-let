"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass = "mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export function TaxExportsPanel({
  landlords,
  taxYears,
  defaultFrom,
  defaultTo,
  nrl,
  nrlQuarterLabel,
}: {
  landlords: { id: string; name: string }[];
  taxYears: { value: number; label: string }[];
  defaultFrom: string;
  defaultTo: string;
  nrl: { landlordId: string; name: string; approvalRef: string | null; profit: number; withheld: number; due: number }[];
  nrlQuarterLabel: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [landlordId, setLandlordId] = useState(landlords[0]?.id ?? "");
  const [year, setYear] = useState(taxYears[0]?.value ?? new Date().getFullYear());
  const [busy, setBusy] = useState<string | null>(null);

  async function withhold(id: string) {
    setBusy(id);
    try {
      await fetch("/api/admin/finance/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "nrl_withhold", landlordId: id }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold">Accounts export</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Every landlord ledger line as CSV for Xero, QuickBooks or a spreadsheet, with fees split into net and VAT.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <a href={`/api/admin/finance/export?from=${from}&to=${to}`}>Download CSV</a>
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h3 className="font-semibold">Landlord tax year summary</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Rent, fees and repairs for the tax year, ready for the landlord&apos;s return. Landlords can download their own
          from the portal.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Landlord</Label>
            <select className={selectClass} value={landlordId} onChange={(e) => setLandlordId(e.target.value)}>
              {landlords.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Tax year</Label>
            <select className={selectClass} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {taxYears.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="mt-3" disabled={!landlordId}>
          <a href={`/api/admin/landlords/${landlordId}/tax-summary?year=${year}`}>Download CSV</a>
        </Button>
      </div>

      {nrl.length > 0 && (
        <div className="rounded-xl border bg-card p-4 lg:col-span-2">
          <h3 className="font-semibold">Non-resident landlords: {nrlQuarterLabel}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            For landlords abroad without HMRC approval, withhold basic rate tax on the quarter&apos;s profit, then pay it to
            HMRC with the NRLQ return within 30 days of the quarter end.
          </p>
          <ul className="mt-3 divide-y text-sm">
            {nrl.map((n) => (
              <li key={n.landlordId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{n.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · profit £{n.profit.toFixed(2)} · withheld £{n.withheld.toFixed(2)}
                  </span>
                </span>
                {n.due > 0 ? (
                  <Button size="sm" disabled={busy !== null} onClick={() => withhold(n.landlordId)}>
                    Withhold £{n.due.toFixed(2)}
                  </Button>
                ) : (
                  <span className="text-emerald-700">Done</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
