"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ApplyLateFeesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      await fetch("/api/admin/finance/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply_late_fees" }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={run} disabled={loading}>
      {loading ? "Applying…" : "Apply late fees"}
    </Button>
  );
}
