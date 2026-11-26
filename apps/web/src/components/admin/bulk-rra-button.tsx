"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BulkRraButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function serve() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/lifecycle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulk_rra" }),
    });
    setLoading(false);
    setMessage(res.ok ? "Served" : "Couldn't serve it");
    if (res.ok) router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={serve} disabled={loading}>
        {loading ? "Serving…" : "Serve RRA info sheet to all"}
      </Button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </span>
  );
}
