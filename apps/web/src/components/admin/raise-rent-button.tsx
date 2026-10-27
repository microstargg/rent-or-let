"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RaiseRentButton() {
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
        body: JSON.stringify({ action: "raise_rent" }),
      });
      const data = (await res.json().catch(() => ({}))) as { created?: number; error?: string };
      if (!res.ok) setMessage(data.error ?? "Could not raise rent invoices");
      else setMessage(data.created ? `Raised ${data.created} rent invoices` : "Rent is already up to date");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
      <Button type="button" variant="secondary" onClick={run} disabled={loading}>
        {loading ? "Raising…" : "Raise rent invoices"}
      </Button>
    </div>
  );
}
