"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ApplyLateFeesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/finance/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply_late_fees" }),
      });
      const data = (await res.json().catch(() => ({}))) as { applied?: number; total?: number; reason?: string };
      setMessage(
        data.reason ??
          (data.applied ? `Charged £${(data.total ?? 0).toFixed(2)} interest on ${data.applied} late payments.` : "Nothing new to charge.")
      );
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="secondary" onClick={run} disabled={loading}>
        {loading ? "Working…" : "Charge late rent interest"}
      </Button>
      {message && <p className="max-w-xs text-right text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
