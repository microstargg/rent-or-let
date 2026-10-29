"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClientAccountCheckForm({
  month,
  periodEndLabel,
  initialBalance,
}: {
  month: string;
  periodEndLabel: string;
  initialBalance: number | null;
}) {
  const router = useRouter();
  const [balance, setBalance] = useState(initialBalance != null ? initialBalance.toFixed(2) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/finance/month-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_balance_check",
          month,
          bank_balance: Number(balance.replace(/[£,\s]/g, "")),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[12rem]">
        <Label htmlFor="bank-balance">Bank balance on {periodEndLabel} (£)</Label>
        <Input
          id="bank-balance"
          inputMode="decimal"
          className="mt-1.5 min-h-11"
          placeholder="From your bank statement"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
        />
      </div>
      <Button type="button" className="min-h-11" disabled={loading || !balance.trim()} onClick={save}>
        {loading ? "Checking…" : "Check balance"}
      </Button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}
