"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PortalConnectionTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  async function retryFailed() {
    setRetrying(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/portals/retry", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Retry failed");
      setResult(
        data.retried === 0
          ? "No failed listings to send again."
          : `Sent again: ${data.succeeded} worked, ${data.failed} still failing.`
      );
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetrying(false);
    }
  }

  async function runTest() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/portals/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Test failed");

      const lines = Object.entries(
        data.results as Record<string, { success: boolean; message?: string; count?: number }>
      ).map(([portal, r]) => {
        if (r.success) {
          return `${portal}: connected (${r.count ?? 0} listings on branch)`;
        }
        return `${portal}: failed — ${r.message ?? "unknown error"}`;
      });

      setResult(lines.join("\n"));
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Test failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border p-4">
      <h2 className="font-semibold">Connection test</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Checks Let Flow can log in to each portal you&apos;ve set up and read your branch&apos;s listings.
        Listings that failed to send are tried again automatically every morning.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" onClick={runTest} disabled={loading || retrying}>
          {loading ? "Testing…" : "Test connection"}
        </Button>
        <Button variant="outline" onClick={retryFailed} disabled={loading || retrying}>
          {retrying ? "Sending…" : "Retry failed listings"}
        </Button>
      </div>
      {result && (
        <pre className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{result}</pre>
      )}
    </div>
  );
}
