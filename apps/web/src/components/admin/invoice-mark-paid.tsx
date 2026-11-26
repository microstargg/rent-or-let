"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * One "Record payment" button. Opens a small form with the amount still owed filled in.
 * The full amount marks the invoice paid; less records a part payment.
 */
export function InvoiceMarkPaid({
  id,
  status,
  outstanding,
}: {
  id: string;
  status?: string;
  outstanding: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(outstanding.toFixed(2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "paid") return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount above £0");
      return;
    }
    const full = value >= outstanding - 0.004;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(full ? { action: "mark_paid" } : { action: "partial_pay", amount: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't record the payment");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Record payment
      </Button>
    );
  }

  const value = Number(amount);
  const isPart = Number.isFinite(value) && value > 0 && value < outstanding - 0.004;

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`pay-${id}`}>
        Amount received
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          £
        </span>
        <Input
          id={`pay-${id}`}
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-8 w-28 pl-5"
          autoFocus
        />
      </div>
      <Button type="submit" size="sm" disabled={loading}>
        {isPart ? "Save part payment" : "Mark paid"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
        Cancel
      </Button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}
