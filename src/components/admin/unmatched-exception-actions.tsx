"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

interface OpenInvoiceOption {
  id: string;
  label: string;
  remaining: number;
}

export function UnmatchedExceptionActions({
  exceptionId,
  invoices,
  suggestedInvoiceId,
}: {
  exceptionId: string;
  invoices: OpenInvoiceOption[];
  suggestedInvoiceId?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const initial =
    (suggestedInvoiceId && invoices.some((i) => i.id === suggestedInvoiceId)
      ? suggestedInvoiceId
      : invoices[0]?.id) ?? "";
  const [invoiceId, setInvoiceId] = useState(initial);
  const selected = useMemo(
    () => invoices.find((i) => i.id === invoiceId) ?? null,
    [invoices, invoiceId]
  );

  async function allocate() {
    if (!invoiceId) return;
    setLoading(true);
    try {
      await fetch("/api/admin/finance/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "allocate_unmatched",
          exceptionId,
          invoiceId,
        }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function ignore() {
    setLoading(true);
    try {
      await fetch("/api/admin/finance/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ignore_unmatched", exceptionId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {invoices.length > 0 ? (
        <>
          <select
            className="h-9 max-w-xs rounded-md border bg-background px-2 text-sm"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            disabled={loading}
          >
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.label} · £{inv.remaining.toFixed(2)} due
              </option>
            ))}
          </select>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" onClick={allocate} disabled={loading || !selected}>
              {loading ? "Saving…" : "Allocate"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={ignore} disabled={loading}>
              Ignore
            </Button>
          </div>
        </>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={ignore} disabled={loading}>
          {loading ? "Saving…" : "Ignore (no open invoices)"}
        </Button>
      )}
    </div>
  );
}
