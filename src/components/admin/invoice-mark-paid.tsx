"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InvoiceMarkPaid({ id, status }: { id: string; status?: string }) {
  const router = useRouter();
  const [partialAmount, setPartialAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function markPaid() {
    setLoading(true);
    try {
      await fetch(`/api/admin/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_paid" }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function partialPay() {
    const amount = Number(partialAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "partial_pay", amount }),
      });
      setPartialAmount("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (status === "paid") return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" onClick={markPaid} disabled={loading}>
        Mark paid
      </Button>
      <Input
        type="number"
        min="0.01"
        step="0.01"
        placeholder="Partial £"
        value={partialAmount}
        onChange={(e) => setPartialAmount(e.target.value)}
        className="h-8 w-28"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={partialPay}
        disabled={loading || !partialAmount}
      >
        Record
      </Button>
    </div>
  );
}
