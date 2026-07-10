"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ComplianceActions({ itemId }: { itemId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      await fetch("/api/admin/compliance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function markServed() {
    if (!itemId) return;
    setLoading(true);
    try {
      await fetch("/api/admin/compliance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_served", id: itemId, served_channel: "hand" }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!itemId) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={loading}>
        {loading ? "Refreshing…" : "Refresh statuses"}
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={markServed} disabled={loading}>
      {loading ? "Saving…" : "Mark served"}
    </Button>
  );
}
