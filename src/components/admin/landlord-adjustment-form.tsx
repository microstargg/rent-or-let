"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LandlordAdjustmentForm({
  landlords,
}: {
  landlords: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [landlordId, setLandlordId] = useState(landlords[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/admin/finance/landlord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjustment",
          landlord_id: landlordId,
          amount: Number(amount),
          memo,
        }),
      });
      setAmount("");
      setMemo("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2">
        <Label htmlFor="landlord">Landlord</Label>
        <select
          id="landlord"
          required
          value={landlordId}
          onChange={(e) => setLandlordId(e.target.value)}
          className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {landlords.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="amount">Amount (+ credit / − debit)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          className="mt-1.5"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="memo">Memo</Label>
        <Input
          id="memo"
          className="mt-1.5"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Optional note"
        />
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={loading || !landlords.length}>
          {loading ? "Posting…" : "Post adjustment"}
        </Button>
      </div>
    </form>
  );
}
