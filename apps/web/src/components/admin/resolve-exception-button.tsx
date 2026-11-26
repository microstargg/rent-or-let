"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ResolveExceptionButton({ id, label = "Resolve" }: { id: string; label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function resolve() {
    setLoading(true);
    try {
      await fetch("/api/admin/finance/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve_exception", exceptionId: id }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={resolve} disabled={loading}>
      {loading ? "Saving…" : label}
    </Button>
  );
}
